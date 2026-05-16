(function() {
  'use strict';

  let fillBtn = null;

  function setNativeValue(element, value) {
    const proto = Object.getPrototypeOf(element);
    const descriptor =
      Object.getOwnPropertyDescriptor(proto, 'value') ||
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value') ||
      Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value');
    if (descriptor && descriptor.set) {
      descriptor.set.call(element, value);
    } else {
      element.value = value;
    }
  }

  function simulateInput(element, value) {
    return new Promise((resolve) => {
      element.focus();
      setNativeValue(element, '');
      element.dispatchEvent(new Event('focus', { bubbles: true }));

      let i = 0;
      function typeNext() {
        if (i < value.length) {
          const char = value[i];
          const keyCode = char.charCodeAt(0);
          const currentVal = value.substring(0, i + 1);

          element.dispatchEvent(new KeyboardEvent('keydown', {
            key: char,
            code: keyCode >= 48 && keyCode <= 57 ? `Digit${char}` : `Key${char.toUpperCase()}`,
            keyCode: keyCode,
            which: keyCode,
            bubbles: true,
            cancelable: true
          }));

          setNativeValue(element, currentVal);
          element.dispatchEvent(new Event('input', { bubbles: true }));

          element.dispatchEvent(new KeyboardEvent('keypress', {
            key: char,
            code: keyCode >= 48 && keyCode <= 57 ? `Digit${char}` : `Key${char.toUpperCase()}`,
            keyCode: keyCode,
            which: keyCode,
            bubbles: true,
            cancelable: true
          }));

          element.dispatchEvent(new KeyboardEvent('keyup', {
            key: char,
            code: keyCode >= 48 && keyCode <= 57 ? `Digit${char}` : `Key${char.toUpperCase()}`,
            keyCode: keyCode,
            which: keyCode,
            bubbles: true,
            cancelable: true
          }));

          i++;

          let delay;
          if (i > 1 && Math.random() < 0.05) {
            delay = 300 + Math.random() * 500;
          } else if (i % 5 === 0) {
            delay = 100 + Math.random() * 150;
          } else {
            delay = 50 + Math.random() * 120;
          }

          setTimeout(typeNext, delay);
        } else {
          element.dispatchEvent(new Event('change', { bubbles: true }));
          setTimeout(() => {
            element.dispatchEvent(new Event('blur', { bubbles: true }));
            resolve();
          }, 100 + Math.random() * 200);
        }
      }

      typeNext();
    });
  }

  function createFillButton() {
    if (fillBtn) return;

    fillBtn = document.createElement('div');
    fillBtn.id = 'stripe-fill-helper-btn';
    fillBtn.innerHTML = `
      <div class="stripe-fill-btn-inner">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
          <polyline points="14 2 14 8 20 8"></polyline>
          <line x1="16" y1="13" x2="8" y2="13"></line>
          <line x1="16" y1="17" x2="8" y2="17"></line>
          <polyline points="10 9 9 9 8 9"></polyline>
        </svg>
        <span>自动填写卡信息</span>
      </div>
    `;

    fillBtn.addEventListener('click', handleAutoFill);
    document.body.appendChild(fillBtn);
  }

  async function handleAutoFill() {
    try {
      const result = await chrome.storage.local.get(['cardInfo', 'addressInfo']);
      const cardInfo = result.cardInfo;
      const addressInfo = result.addressInfo;

      if (!cardInfo || !cardInfo.number) {
        showNotification('请先在插件中设置卡信息', 'error');
        return;
      }

      showNotification('正在自动填写...', 'info');

      await fillStripeForm(cardInfo, addressInfo);

      showNotification('填写完成！', 'success');
    } catch (error) {
      showNotification('填写失败: ' + error.message, 'error');
    }
  }

  async function fillStripeForm(cardInfo, addressInfo) {
    const selectors = {
      cardNumber: [
        'input[name="cardnumber"]',
        'input[placeholder*="card number"]',
        'input[placeholder*="Card number"]',
        'input[data-elements-stable-field-name="cardNumber"]',
        '#cardNumber',
        '.CardNumberInput input'
      ],
      cardExpiry: [
        'input[name="exp-date"]',
        'input[placeholder*="MM / YY"]',
        'input[placeholder*="Expiration"]',
        'input[data-elements-stable-field-name="cardExpiry"]',
        '#cardExpiry',
        '.CardExpiryInput input'
      ],
      cardCvc: [
        'input[name="cvc"]',
        'input[placeholder*="CVC"]',
        'input[placeholder*="CVV"]',
        'input[data-elements-stable-field-name="cardCvc"]',
        '#cardCvc',
        '.CardCvcInput input'
      ],
      cardName: [
        'input[name="name"]',
        'input[placeholder*="Name"]',
        'input[placeholder*="name"]',
        '#billingName',
        '.BillingDetailsForm input[name="name"]'
      ],
      address: [
        'input[name="address"]',
        'input[placeholder*="Address"]',
        'input[placeholder*="address"]',
        '#billingAddress',
        'input[name="billingAddress"]'
      ],
      city: [
        'input[name="city"]',
        'input[placeholder*="City"]',
        'input[placeholder*="city"]',
        '#billingCity'
      ],
      state: [
        'input[name="state"]',
        'select[name="state"]',
        'input[placeholder*="State"]',
        '#billingState'
      ],
      zip: [
        'input[name="zip"]',
        'input[name="postal_code"]',
        'input[placeholder*="ZIP"]',
        'input[placeholder*="Postal"]',
        '#billingZip'
      ],
      country: [
        'select[name="country"]',
        'select[name="billingCountry"]',
        '#billingCountry'
      ]
    };

    function findElement(selectorList) {
      for (const selector of selectorList) {
        const el = document.querySelector(selector);
        if (el) return el;
      }
      return null;
    }

    function delay(ms) {
      return new Promise(resolve => setTimeout(resolve, ms));
    }

    const cardNumEl = findElement(selectors.cardNumber);
    if (cardNumEl) {
      await simulateInput(cardNumEl, cardInfo.number);
      await delay(300);
    }

    const expiryEl = findElement(selectors.cardExpiry);
    if (expiryEl) {
      const expiry = cardInfo.expiry.replace('/', ' / ');
      await simulateInput(expiryEl, expiry);
      await delay(300);
    }

    const cvcEl = findElement(selectors.cardCvc);
    if (cvcEl) {
      await simulateInput(cvcEl, cardInfo.cvv);
      await delay(300);
    }

    const nameEl = findElement(selectors.cardName);
    if (nameEl && cardInfo.name) {
      await simulateInput(nameEl, cardInfo.name);
      await delay(300);
    }

    if (addressInfo) {
      const addressEl = findElement(selectors.address);
      if (addressEl && addressInfo.address) {
        await simulateInput(addressEl, addressInfo.address);
        await delay(200);
      }

      const cityEl = findElement(selectors.city);
      if (cityEl && addressInfo.city) {
        await simulateInput(cityEl, addressInfo.city);
        await delay(200);
      }

      const stateEl = findElement(selectors.state);
      if (stateEl && addressInfo.state) {
        if (stateEl.tagName === 'SELECT') {
          const options = Array.from(stateEl.options);
          const match = options.find(o =>
            o.value.toLowerCase().includes(addressInfo.state.toLowerCase()) ||
            o.text.toLowerCase().includes(addressInfo.state.toLowerCase())
          );
          if (match) {
            stateEl.value = match.value;
            stateEl.dispatchEvent(new Event('change', { bubbles: true }));
          }
        } else {
          await simulateInput(stateEl, addressInfo.state);
        }
        await delay(200);
      }

      const zipEl = findElement(selectors.zip);
      if (zipEl && addressInfo.zip) {
        await simulateInput(zipEl, addressInfo.zip);
        await delay(200);
      }

      const countryEl = findElement(selectors.country);
      if (countryEl) {
        const options = Array.from(countryEl.options);
        const usOption = options.find(o => o.value === 'US' || o.text.includes('United States'));
        if (usOption) {
          countryEl.value = usOption.value;
          countryEl.dispatchEvent(new Event('change', { bubbles: true }));
        }
      }
    }
  }

  function showNotification(message, type = 'info') {
    const existing = document.getElementById('stripe-helper-notification');
    if (existing) existing.remove();

    const notification = document.createElement('div');
    notification.id = 'stripe-helper-notification';
    notification.className = `stripe-helper-notification stripe-helper-${type}`;
    notification.textContent = message;
    document.body.appendChild(notification);

    setTimeout(() => {
      notification.classList.add('stripe-helper-show');
    }, 10);

    setTimeout(() => {
      notification.classList.remove('stripe-helper-show');
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  }

  function init() {
    createFillButton();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  const observer = new MutationObserver(() => {
    if (!document.getElementById('stripe-fill-helper-btn')) {
      createFillButton();
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });
})();

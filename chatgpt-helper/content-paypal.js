(function() {
  'use strict';

  let ppBtn = null;
  let smsCheckInterval = null;

  function generatePassword(length = 16) {
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < length; i++) {
      password += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    return password;
  }

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

  function simulateHumanInput(element, value) {
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

  function findElement(selectors) {
    for (const selector of selectors) {
      try {
        const el = document.querySelector(selector);
        if (el) return el;
      } catch (e) {}
    }
    return null;
  }

  async function fetchSmsCode(apiUrl) {
    try {
      const response = await fetch(apiUrl);
      const data = await response.json();

      if (data && data.code) {
        return data.code;
      } else if (data && data.sms) {
        const codeMatch = data.sms.match(/\d{4,6}/);
        if (codeMatch) return codeMatch[0];
      }
      return null;
    } catch (error) {
      console.error('[PP Helper] Fetch SMS error:', error);
      return null;
    }
  }

  function startAutoSmsCheck(apiUrl) {
    if (smsCheckInterval) {
      clearInterval(smsCheckInterval);
    }

    let checkCount = 0;
    const maxChecks = 60;

    smsCheckInterval = setInterval(async () => {
      checkCount++;

      if (checkCount > maxChecks) {
        clearInterval(smsCheckInterval);
        smsCheckInterval = null;
        showNotification('验证码获取超时，请手动获取', 'error');
        return;
      }

      const code = await fetchSmsCode(apiUrl);
      if (code) {
        clearInterval(smsCheckInterval);
        smsCheckInterval = null;

        const codeInput = findElement([
          'input[name="code"]',
          'input[name="otp"]',
          'input[name="smsCode"]',
          'input[placeholder*="code"]',
          'input[placeholder*="Code"]',
          'input[placeholder*="验证码"]',
          'input[type="tel"]',
          'input[type="number"]'
        ]);

        if (codeInput) {
          await simulateHumanInput(codeInput, code);
          showNotification(`验证码 ${code} 已自动填入`, 'success');
        } else {
          await navigator.clipboard.writeText(code);
          showNotification(`验证码 ${code} 已复制到剪贴板`, 'success');
        }
      }
    }, 3000);
  }

  function createPPButton() {
    if (ppBtn) return;

    ppBtn = document.createElement('div');
    ppBtn.id = 'pp-helper-btn';
    ppBtn.innerHTML = `
      <div class="pp-helper-btn-inner">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z"></path>
          <path d="M8 12l2 2 4-4"></path>
        </svg>
        <span>PP自动填写</span>
      </div>
    `;

    ppBtn.addEventListener('click', handlePPAutoFill);
    document.body.appendChild(ppBtn);
  }

  async function handlePPAutoFill() {
    try {
      const result = await chrome.storage.local.get(['cardInfo', 'addressInfo', 'ppSettings']);
      const { cardInfo, addressInfo, ppSettings } = result;

      showNotification('正在检测页面并自动填写...', 'info');

      const isRegistration = document.querySelector('input[name="firstName"]') ||
                             document.querySelector('#firstName') ||
                             document.body.innerHTML.includes('Create your account');

      const isVerification = document.querySelector('input[name="code"]') ||
                             document.querySelector('input[name="otp"]') ||
                             document.body.innerHTML.includes('verification code') ||
                             document.body.innerHTML.includes('Enter the code');

      if (isVerification && ppSettings?.smsApiUrl) {
        showNotification('检测到验证码页面，正在自动获取...', 'info');
        startAutoSmsCheck(ppSettings.smsApiUrl);
      } else if (isRegistration) {
        await fillPPRegistration(cardInfo, addressInfo, ppSettings);
      } else {
        await fillPPPayment(cardInfo, addressInfo);
      }

      showNotification('填写完成！', 'success');
    } catch (error) {
      showNotification('填写失败: ' + error.message, 'error');
    }
  }

  async function fillPPRegistration(cardInfo, addressInfo, ppSettings) {
    const delay = (ms) => new Promise(r => setTimeout(r, ms));

    const fullNameEl = findElement(['#full-name', 'input[name="name"]']);
    if (fullNameEl && cardInfo?.name) {
      await simulateHumanInput(fullNameEl, cardInfo.name);
      await delay(300);
    }

    const firstNameEl = findElement(['#firstName', 'input[name="fname"]']);
    if (firstNameEl && cardInfo?.name) {
      const nameParts = cardInfo.name.split(' ');
      await simulateHumanInput(firstNameEl, nameParts[0] || '');
      await delay(300);
    }

    const lastNameEl = findElement(['#lastName', 'input[name="lname"]']);
    if (lastNameEl && cardInfo?.name) {
      const nameParts = cardInfo.name.split(' ');
      await simulateHumanInput(lastNameEl, nameParts.slice(1).join(' ') || '');
      await delay(300);
    }

    const phoneEl = findElement(['#phone', 'input[name="phone"]', 'input[data-testid="phone"]']);
    if (phoneEl && ppSettings?.phone) {
      await simulateHumanInput(phoneEl, ppSettings.phone);
      await delay(300);
    }

    const cardNumEl = findElement(['#cardNumber', 'input[name="cardnumber"]']);
    if (cardNumEl && cardInfo?.number) {
      await simulateHumanInput(cardNumEl, cardInfo.number);
      await delay(500);
    }

    const expiryEl = findElement(['#cardExpiry', 'input[name="exp-date"]']);
    if (expiryEl && cardInfo?.expiry) {
      await simulateHumanInput(expiryEl, cardInfo.expiry);
      await delay(300);
    }

    const cvvEl = findElement(['#cardCvv', 'input[name="cvv"]']);
    if (cvvEl && cardInfo?.cvv) {
      await simulateHumanInput(cvvEl, cardInfo.cvv);
      await delay(300);
    }

    const fullAddr = addressInfo?.fullAddress || '';
    if (fullAddr) {
      const addressEl = findElement(['#billingLine1', 'input[name="billingLine1"]']);
      if (addressEl) {
        await simulateHumanInput(addressEl, fullAddr);
        await delay(500);
      }
    } else {
      const addressEl = findElement(['#billingLine1', 'input[name="billingLine1"]']);
      if (addressEl && addressInfo?.address) {
        await simulateHumanInput(addressEl, addressInfo.address);
        await delay(300);
      }
      const cityEl = findElement(['#billingCity', 'input[name="billingCity"]']);
      if (cityEl && addressInfo?.city) {
        await simulateHumanInput(cityEl, addressInfo.city);
        await delay(300);
      }
      const stateEl = findElement(['#billingState', 'select[name="billingState"]']);
      if (stateEl && addressInfo?.state) {
        if (stateEl.tagName === 'SELECT') {
          const options = Array.from(stateEl.options);
          const match = options.find(o =>
            o.value.toLowerCase() === addressInfo.state.toLowerCase() ||
            o.text.toLowerCase().includes(addressInfo.state.toLowerCase())
          );
          if (match) {
            stateEl.value = match.value;
            stateEl.dispatchEvent(new Event('change', { bubbles: true }));
          }
        } else {
          await simulateHumanInput(stateEl, addressInfo.state);
        }
        await delay(300);
      }
      const zipEl = findElement(['#billingPostalCode', 'input[name="billingPostalCode"]']);
      if (zipEl && addressInfo?.zip) {
        await simulateHumanInput(zipEl, addressInfo.zip);
        await delay(300);
      }
    }

    const passwordEl = findElement(['#password', 'input[name="password"]']);
    if (passwordEl && !passwordEl.value) {
      const password = generatePassword();
      await simulateHumanInput(passwordEl, password);
      showNotification(`密码已生成: ${password}`, 'info');
      await delay(300);
    }

    if (ppSettings?.smsApiUrl) {
      showNotification('提交后将自动获取验证码...', 'info');
    }
  }

  async function fillPPPayment(cardInfo, addressInfo) {
    const delay = (ms) => new Promise(r => setTimeout(r, ms));

    const cardNumberSelectors = ['input[name="cardNumber"]', '#cardNumber', 'input[placeholder*="Card"]'];
    const expirySelectors = ['input[name="expiryDate"]', '#expiryDate', 'input[placeholder*="MM/YY"]'];
    const cvvSelectors = ['input[name="cvv"]', '#cvv', 'input[name="cvc"]', 'input[placeholder*="CVV"]'];

    const cardNumEl = findElement(cardNumberSelectors);
    if (cardNumEl && cardInfo?.number) {
      await simulateHumanInput(cardNumEl, cardInfo.number);
      await delay(300);
    }

    const expiryEl = findElement(expirySelectors);
    if (expiryEl && cardInfo?.expiry) {
      await simulateHumanInput(expiryEl, cardInfo.expiry);
      await delay(300);
    }

    const cvvEl = findElement(cvvSelectors);
    if (cvvEl && cardInfo?.cvv) {
      await simulateHumanInput(cvvEl, cardInfo.cvv);
      await delay(300);
    }
  }

  function showNotification(message, type = 'info') {
    const existing = document.getElementById('pp-helper-notification');
    if (existing) existing.remove();

    const notification = document.createElement('div');
    notification.id = 'pp-helper-notification';
    notification.className = `pp-helper-notification pp-helper-${type}`;
    notification.textContent = message;
    document.body.appendChild(notification);

    setTimeout(() => {
      notification.classList.add('pp-helper-show');
    }, 10);

    setTimeout(() => {
      notification.classList.remove('pp-helper-show');
      setTimeout(() => notification.remove(), 300);
    }, 5000);
  }

  function init() {
    createPPButton();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  const observer = new MutationObserver(() => {
    if (!document.getElementById('pp-helper-btn')) {
      createPPButton();
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });
})();

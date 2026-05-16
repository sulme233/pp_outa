(function() {
  'use strict';

  let paymentBtn = null;
  let registerBtn = null;
  let emailCheckInterval = null;

  async function fetchEmailCode() {
    try {
      const result = await chrome.storage.local.get(['emailInfo']);
      const { emailInfo } = result;
      if (!emailInfo || !emailInfo.email || !emailInfo.clientId || !emailInfo.refreshToken) {
        return null;
      }

      const response = await new Promise((resolve, reject) => {
        chrome.runtime.sendMessage({
          action: 'fetchEmailCode',
          emailApiUrl: 'https://apple.882263.xyz',
          email: emailInfo.email,
          clientId: emailInfo.clientId,
          refreshToken: emailInfo.refreshToken
        }, (res) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            resolve(res);
          }
        });
      });

      if (response && response.success && response.code) {
        return response.code;
      }
      return null;
    } catch (error) {
      console.error('[GPT Helper] Fetch email code error:', error);
      return null;
    }
  }

  function startAutoEmailCheck() {
    if (emailCheckInterval) {
      clearInterval(emailCheckInterval);
    }

    let checkCount = 0;
    const maxChecks = 60;

    emailCheckInterval = setInterval(async () => {
      checkCount++;

      if (checkCount > maxChecks) {
        clearInterval(emailCheckInterval);
        emailCheckInterval = null;
        showNotification('验证码获取超时，请手动获取', 'error');
        return;
      }

      const code = await fetchEmailCode();
      if (code) {
        clearInterval(emailCheckInterval);
        emailCheckInterval = null;

        const codeInput = document.querySelector('input[name="code"]') ||
                         document.querySelector('input[placeholder*="code"]') ||
                         document.querySelector('input[placeholder*="Code"]') ||
                         document.querySelector('input[type="tel"]') ||
                         document.querySelector('input[type="number"]') ||
                         document.querySelector('input[code]');

        if (codeInput) {
          await simulateHumanInput(codeInput, code);
          showNotification(`验证码 ${code} 已自动填入`, 'success');

          await new Promise(r => setTimeout(r, 800));
          const continueBtn = document.querySelector('button[type="submit"]') ||
                             document.querySelector('button.continue-btn') ||
                             document.querySelector('button');
          if (continueBtn && continueBtn.textContent.toLowerCase().includes('continue')) {
            await simulateClick(continueBtn);
          }
        } else {
          await navigator.clipboard.writeText(code);
          showNotification(`验证码 ${code} 已复制到剪贴板`, 'success');
        }
      }
    }, 3000);
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

  function simulateClick(element) {
    return new Promise((resolve) => {
      element.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
      element.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
      element.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      setTimeout(resolve, 100 + Math.random() * 200);
    });
  }

  function createPaymentButton() {
    if (paymentBtn) return;

    paymentBtn = document.createElement('div');
    paymentBtn.id = 'gpt-payment-helper-btn';
    paymentBtn.innerHTML = `
      <div class="gpt-pay-btn-inner">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect>
          <line x1="1" y1="10" x2="23" y2="10"></line>
        </svg>
        <span>获取支付链接</span>
      </div>
    `;

    paymentBtn.addEventListener('click', handleGetPaymentLink);
    document.body.appendChild(paymentBtn);
  }

  function createRegisterButton() {
    if (registerBtn) return;

    registerBtn = document.createElement('div');
    registerBtn.id = 'gpt-register-helper-btn';
    registerBtn.innerHTML = `
      <div class="gpt-register-btn-inner">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
          <circle cx="8.5" cy="7" r="4"></circle>
          <line x1="20" y1="8" x2="20" y2="14"></line>
          <line x1="23" y1="11" x2="17" y2="11"></line>
        </svg>
        <span>自动注册</span>
      </div>
    `;

    registerBtn.addEventListener('click', handleAutoRegister);
    document.body.appendChild(registerBtn);
  }

  async function handleGetPaymentLink() {
    try {
      showNotification('正在获取支付链接...', 'info');

      const sessionResponse = await fetch('/api/auth/session');
      const sessionData = await sessionResponse.json();

      if (!sessionData.accessToken) {
        showNotification('请先登录 ChatGPT！', 'error');
        return;
      }

      const checkoutData = {
        plan_name: 'chatgptplusplan',
        billing_details: {
          country: 'DE',
          currency: 'EUR'
        },
        checkout_ui_mode: 'custom'
      };

      const response = await fetch('https://chatgpt.com/backend-api/payments/checkout', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + sessionData.accessToken,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(checkoutData)
      });

      const result = await response.json();

      if (result.checkout_session_id) {
        const checkoutUrl = 'https://chatgpt.com/checkout/openai_ie/' + result.checkout_session_id;
        showNotification('支付链接获取成功！', 'success');
        window.location.href = checkoutUrl;
      } else {
        showNotification('提取失败：' + (result.detail || JSON.stringify(result)), 'error');
      }
    } catch (error) {
      showNotification('发生错误：' + error.message, 'error');
    }
  }

  async function handleAutoRegister() {
    try {
      const result = await chrome.storage.local.get(['emailInfo']);
      const { emailInfo } = result;

      if (!emailInfo || !emailInfo.email) {
        showNotification('请先在插件中配置邮箱信息', 'error');
        return;
      }

      showNotification('正在自动注册...', 'info');

      const emailInput = document.querySelector('input[name="email"]') ||
                         document.querySelector('input[type="email"]') ||
                         document.querySelector('#email-input');

      if (emailInput) {
        await simulateHumanInput(emailInput, emailInfo.email);
        await new Promise(r => setTimeout(r, 500));

        const continueBtn = document.querySelector('button[type="submit"]') ||
                           document.querySelector('button:has(> span:contains("Continue"))') ||
                           document.querySelector('button.continue-btn');

        if (continueBtn) {
          await simulateClick(continueBtn);
          showNotification('邮箱已输入，正在等待验证码...', 'info');
          await new Promise(r => setTimeout(r, 3000));
          startAutoEmailCheck();
        }
      } else {
        showNotification('未找到邮箱输入框', 'error');
      }
    } catch (error) {
      showNotification('注册失败: ' + error.message, 'error');
    }
  }

  function showNotification(message, type = 'info') {
    const existing = document.getElementById('gpt-helper-notification');
    if (existing) existing.remove();

    const notification = document.createElement('div');
    notification.id = 'gpt-helper-notification';
    notification.className = `gpt-helper-notification gpt-helper-${type}`;
    notification.textContent = message;
    document.body.appendChild(notification);

    setTimeout(() => {
      notification.classList.add('gpt-helper-show');
    }, 10);

    setTimeout(() => {
      notification.classList.remove('gpt-helper-show');
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  }

  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'getPaymentLink') {
      handleGetPaymentLink();
      sendResponse({ success: true });
    }

    if (request.action === 'registerGPT') {
      handleAutoRegister();
      sendResponse({ success: true });
    }

    if (request.action === 'pageReady') {
      sendResponse({ success: true });
    }

    if (request.action === 'gptAuthPage') {
      createRegisterButton();
      sendResponse({ success: true });
    }

    return true;
  });

  function init() {
    createPaymentButton();

    if (window.location.href.includes('auth0.openai.com') ||
        window.location.href.includes('chatgpt.com/auth/login')) {
      createRegisterButton();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  const observer = new MutationObserver(() => {
    if (!document.getElementById('gpt-payment-helper-btn')) {
      createPaymentButton();
    }
    if (!document.getElementById('gpt-register-helper-btn') &&
        (window.location.href.includes('auth0.openai.com') ||
         window.location.href.includes('chatgpt.com/auth/login'))) {
      createRegisterButton();
    }

    const pageText = document.body.innerText || '';
    if ((pageText.includes('Check your inbox') || (pageText.includes('Enter the') && pageText.includes('code'))) &&
        !emailCheckInterval) {
      startAutoEmailCheck();
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });
})();

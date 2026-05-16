chrome.runtime.onInstalled.addListener(() => {
  console.log('ChatGPT 支付助手已安装');

  chrome.storage.local.set({
    cardInfo: {
      number: '',
      expiry: '',
      cvv: '',
      name: '',
      id: ''
    },
    addressInfo: {
      address: '',
      city: '',
      state: '',
      zip: '',
      country: 'US'
    },
    emailInfo: {
      email: '',
      password: '',
      clientId: '',
      refreshToken: '',
      accessToken: ''
    },
    ppSettings: {
      phone: '+15828882140',
      smsApiUrl: '',
      autoSimulate: true
    }
  });
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getStorage') {
    chrome.storage.local.get(request.keys, (result) => {
      sendResponse(result);
    });
    return true;
  }

  if (request.action === 'setStorage') {
    chrome.storage.local.set(request.data, () => {
      sendResponse({ success: true });
    });
    return true;
  }

  if (request.action === 'fetchSmsCode') {
    fetch(request.apiUrl)
      .then(response => response.json())
      .then(data => {
        let code = null;
        if (data && data.code) {
          code = data.code;
        } else if (data && data.sms) {
          const codeMatch = data.sms.match(/\d{4,6}/);
          if (codeMatch) code = codeMatch[0];
        }
        sendResponse({ success: true, code });
      })
      .catch(error => {
        sendResponse({ success: false, error: error.message });
      });
    return true;
  }

  if (request.action === 'registerGPT') {
    const { emailInfo } = request;
    sendResponse({ success: true, message: '注册请求已发送' });
    return true;
  }

  if (request.action === 'refreshEmailToken') {
    const { clientId, refreshToken } = request;
    fetch('https://login.microsoftonline.com/consumers/oauth2/v2.0/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        client_id: clientId,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
        scope: 'https://outlook.office365.com/IMAP.AccessAsUser.All offline_access'
      })
    })
      .then(response => response.json())
      .then(data => {
        if (data.access_token) {
          sendResponse({ success: true, accessToken: data.access_token });
        } else {
          sendResponse({ success: false, error: data.error_description || '获取令牌失败' });
        }
      })
      .catch(error => {
        sendResponse({ success: false, error: error.message });
      });
    return true;
  }

  if (request.action === 'log') {
    console.log('[ChatGPT Helper]', request.message);
    sendResponse({ success: true });
    return true;
  }
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete') {
    if (tab.url?.includes('chat.openai.com') || tab.url?.includes('chatgpt.com')) {
      chrome.tabs.sendMessage(tabId, { action: 'pageReady' }).catch(() => {});
    } else if (tab.url?.includes('checkout.stripe.com')) {
      chrome.tabs.sendMessage(tabId, { action: 'pageReady' }).catch(() => {});
    } else if (tab.url?.includes('paypal.com')) {
      chrome.tabs.sendMessage(tabId, { action: 'pageReady' }).catch(() => {});
    } else if (tab.url?.includes('auth0.openai.com') || tab.url?.includes('chatgpt.com/auth/login')) {
      chrome.tabs.sendMessage(tabId, { action: 'gptAuthPage' }).catch(() => {});
    }
  }
});

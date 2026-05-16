document.addEventListener('DOMContentLoaded', () => {
  const rawCardInfo = document.getElementById('rawCardInfo');
  const cardNumber = document.getElementById('cardNumber');
  const cardExpiry = document.getElementById('cardExpiry');
  const cardCvv = document.getElementById('cardCvv');
  const cardName = document.getElementById('cardName');
  const usAddress = document.getElementById('usAddress');
  const usCity = document.getElementById('usCity');
  const usState = document.getElementById('usState');
  const usZip = document.getElementById('usZip');
  const rawEmailInfo = document.getElementById('rawEmailInfo');
  const emailAddress = document.getElementById('emailAddress');
  const emailPassword = document.getElementById('emailPassword');
  const clientId = document.getElementById('clientId');
  const refreshToken = document.getElementById('refreshToken');
  const ppPhone = document.getElementById('ppPhone');
  const statusLog = document.getElementById('statusLog');
  const toggleSimulate = document.getElementById('toggleSimulate');

  function addLog(message, type = 'info') {
    const item = document.createElement('div');
    item.className = `status-item status-${type}`;
    const time = new Date().toLocaleTimeString();
    item.textContent = `[${time}] ${message}`;
    statusLog.insertBefore(item, statusLog.firstChild);
    if (statusLog.children.length > 20) {
      statusLog.removeChild(statusLog.lastChild);
    }
  }

  chrome.storage.local.get(['cardInfo', 'addressInfo', 'emailInfo', 'ppSettings'], (result) => {
    if (result.cardInfo) {
      cardNumber.value = result.cardInfo.number || '';
      cardExpiry.value = result.cardInfo.expiry || '';
      cardCvv.value = result.cardInfo.cvv || '';
      cardName.value = result.cardInfo.name || '';
    }
    if (result.addressInfo) {
      usAddress.value = result.addressInfo.address || '';
      usCity.value = result.addressInfo.city || '';
      usState.value = result.addressInfo.state || '';
      usZip.value = result.addressInfo.zip || '';
    }
    if (result.emailInfo) {
      emailAddress.value = result.emailInfo.email || '';
      emailPassword.value = result.emailInfo.password || '';
      clientId.value = result.emailInfo.clientId || '';
      refreshToken.value = result.emailInfo.refreshToken || '';
    }
    if (result.ppSettings) {
      ppPhone.value = result.ppSettings.phone || '+15828882140';
      if (result.ppSettings.autoSimulate === false) {
        toggleSimulate.classList.remove('active');
      }
    } else {
      ppPhone.value = '+15828882140';
    }
  });

  function parseRawCardInfo(raw) {
    const parts = raw.split('----').map(p => p.trim());
    const info = {
      id: '',
      number: '',
      expiry: '',
      cvv: '',
      phone: '',
      name: '',
      address: '',
      smsApi: ''
    };

    if (parts.length >= 8) {
      info.id = parts[0] || '';
      info.number = parts[1] || '';
      info.expiry = parts[2] || '';
      info.cvv = parts[3] || '';
      info.phone = parts[4] || '';
      info.name = parts[5] || '';

      const addressPart = parts[6] || '';
      const addressMatch = addressPart.match(/^(.+?)\s*,\s*(.+?)\s+(\d{5}),\s*(\w{2})$/);
      if (addressMatch) {
        info.address = addressMatch[1].trim();
        info.city = addressMatch[2].trim();
        info.zip = addressMatch[3].trim();
        info.state = addressMatch[4].trim();
      } else {
        info.address = addressPart;
      }

      info.smsApi = parts[7] || '';
    }

    if (info.expiry) {
      const ymdMatch = info.expiry.match(/^(\d{4})\/(\d{1,2})$/);
      if (ymdMatch) {
        const month = ymdMatch[2].padStart(2, '0');
        const year = ymdMatch[1].slice(-2);
        info.expiry = month + '/' + year;
      } else if (!info.expiry.includes('/')) {
        const compactMatch = info.expiry.match(/^(\d{2})(\d{2,4})$/);
        if (compactMatch) {
          info.expiry = compactMatch[1] + '/' + compactMatch[2].slice(-2);
        }
      }
    }

    return info;
  }

  document.getElementById('parseCardInfo').addEventListener('click', () => {
    const raw = rawCardInfo.value.trim();
    if (!raw) {
      addLog('请先粘贴卡信息', 'error');
      return;
    }

    const parsed = parseRawCardInfo(raw);

    if (parsed.number) cardNumber.value = parsed.number;
    if (parsed.expiry) cardExpiry.value = parsed.expiry;
    if (parsed.cvv) cardCvv.value = parsed.cvv;
    if (parsed.name) cardName.value = parsed.name;

    if (parsed.address) {
      usAddress.value = parsed.address;
    }
    if (parsed.city) usCity.value = parsed.city;
    if (parsed.state) usState.value = parsed.state;
    if (parsed.zip) usZip.value = parsed.zip;

    if (parsed.smsApi) {
      smsApiUrl.value = parsed.smsApi;
    }

    const cardInfo = {
      number: cardNumber.value.replace(/\s/g, ''),
      expiry: cardExpiry.value,
      cvv: cardCvv.value,
      name: cardName.value,
      id: parsed.id
    };

    const addressInfo = {
      fullAddress: parts[6] || '',
      address: usAddress.value,
      city: usCity.value,
      state: usState.value,
      zip: usZip.value,
      country: 'US'
    };

    chrome.storage.local.set({ cardInfo, addressInfo });
    addLog('卡信息解析成功并已保存', 'success');
    addLog(`卡号: ${cardInfo.number}`, 'info');
    addLog(`有效期: ${cardInfo.expiry}`, 'info');
    addLog(`CVV: ${cardInfo.cvv}`, 'info');
  });

  document.getElementById('parseEmailInfo').addEventListener('click', () => {
    const raw = rawEmailInfo.value.trim();
    if (!raw) {
      addLog('请先粘贴邮箱信息', 'error');
      return;
    }

    const parts = raw.split('----').map(p => p.trim());
    const emailInfo = {
      email: parts[0] || '',
      password: parts[1] || '',
      clientId: parts[2] || '',
      refreshToken: parts[3] || ''
    };

    emailAddress.value = emailInfo.email;
    emailPassword.value = emailInfo.password;
    clientId.value = emailInfo.clientId;
    refreshToken.value = emailInfo.refreshToken;

    chrome.storage.local.set({ emailInfo });
    addLog('邮箱信息解析成功并已保存', 'success');
    addLog(`邮箱: ${emailInfo.email}`, 'info');
  });

  document.getElementById('saveCardInfo').addEventListener('click', () => {
    const cardInfo = {
      number: cardNumber.value.replace(/\s/g, ''),
      expiry: cardExpiry.value,
      cvv: cardCvv.value,
      name: cardName.value
    };
    const addressInfo = {
      address: usAddress.value,
      city: usCity.value,
      state: usState.value,
      zip: usZip.value,
      country: 'US'
    };
    chrome.storage.local.set({ cardInfo, addressInfo });
    addLog('卡信息已保存', 'success');
  });

  document.getElementById('gotoRegister').addEventListener('click', () => {
    chrome.tabs.create({ url: 'https://chatgpt.com/auth/login' });
    addLog('正在打开GPT注册页面...', 'info');
  });

  document.getElementById('gotoSession').addEventListener('click', () => {
    chrome.tabs.create({ url: 'https://chatgpt.com/api/auth/session' });
    addLog('正在获取Session...', 'info');
  });

  document.getElementById('getPaymentLink').addEventListener('click', () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs[0];
      if (tab.url && (tab.url.includes('chat.openai.com') || tab.url.includes('chatgpt.com'))) {
        chrome.tabs.sendMessage(tab.id, { action: 'getPaymentLink' });
        addLog('正在获取支付链接...', 'info');
      } else {
        addLog('请先打开ChatGPT页面', 'error');
      }
    });
  });

  document.getElementById('registerGPT').addEventListener('click', async () => {
    const email = emailAddress.value.trim();
    const pwd = emailPassword.value.trim();
    const cid = clientId.value.trim();
    const rtoken = refreshToken.value.trim();

    if (!email || !pwd || !cid || !rtoken) {
      addLog('请先填写完整的邮箱信息', 'error');
      return;
    }

    addLog('开始注册ChatGPT账号...', 'info');

    try {
      const tokenResponse = await fetch('https://login.microsoftonline.com/consumers/oauth2/v2.0/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
          client_id: cid,
          refresh_token: rtoken,
          grant_type: 'refresh_token',
          scope: 'https://outlook.office365.com/IMAP.AccessAsUser.All offline_access'
        })
      });

      const tokenData = await tokenResponse.json();

      if (tokenData.access_token) {
        addLog('获取邮箱访问令牌成功', 'success');

        const emailInfo = {
          email: email,
          password: pwd,
          clientId: cid,
          refreshToken: rtoken,
          accessToken: tokenData.access_token
        };

        chrome.storage.local.set({ emailInfo });
        addLog('邮箱配置已更新', 'success');

        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          chrome.tabs.sendMessage(tabs[0].id, {
            action: 'registerGPT',
            emailInfo: emailInfo
          });
        });
      } else {
        addLog('获取令牌失败: ' + (tokenData.error_description || '未知错误'), 'error');
      }
    } catch (error) {
      addLog('注册失败: ' + error.message, 'error');
    }
  });

  document.getElementById('fetchEmailCode').addEventListener('click', async () => {
    const emailApiUrl = document.getElementById('emailApiUrl').value.trim().replace(/\/+$/, '');
    const email = emailAddress.value.trim();
    const cid = clientId.value.trim();
    const rtoken = refreshToken.value.trim();
    const emailCodeResult = document.getElementById('emailCodeResult');
    const emailCodeContent = document.getElementById('emailCodeContent');

    if (!emailApiUrl) {
      addLog('请先设置邮件读取API', 'error');
      return;
    }

    if (!email || !cid || !rtoken) {
      addLog('请先填写邮箱、Client ID和Refresh Token', 'error');
      return;
    }

    addLog('正在读取邮件验证码...', 'info');

    try {
      const url = `${emailApiUrl}/api/mail-new?refresh_token=${encodeURIComponent(rtoken)}&client_id=${encodeURIComponent(cid)}&email=${encodeURIComponent(email)}&mailbox=INBOX&response_type=json`;
      const response = await fetch(url);
      const data = await response.json();

      if (data && data.subject) {
        const subject = data.subject || '';
        const body = data.body || data.text || data.content || '';

        const codeMatch = subject.match(/\d{4,6}/) || body.match(/\d{4,6}/);

        if (codeMatch) {
          addLog(`邮件验证码: ${codeMatch[0]}`, 'success');
          await navigator.clipboard.writeText(codeMatch[0]);
          addLog('验证码已复制到剪贴板', 'success');

          emailCodeResult.style.display = 'block';
          emailCodeContent.innerHTML = `<div style="color: #64ffda;">验证码: ${codeMatch[0]}</div><div style="color: #8892b0; margin-top: 4px;">主题: ${subject}</div>`;
        } else {
          addLog('邮件中未找到验证码', 'error');
          emailCodeResult.style.display = 'block';
          emailCodeContent.innerHTML = `<div style="color: #ff6b6b;">未找到验证码</div><div style="color: #8892b0; margin-top: 4px;">主题: ${subject}</div>`;
        }
      } else if (data && data.error) {
        addLog('API错误: ' + data.error, 'error');
        emailCodeResult.style.display = 'block';
        emailCodeContent.innerHTML = `<div style="color: #ff6b6b;">${data.error}</div>`;
      } else {
        addLog('未找到邮件', 'error');
        emailCodeResult.style.display = 'block';
        emailCodeContent.innerHTML = `<div style="color: #ff6b6b;">未找到邮件</div>`;
      }
    } catch (error) {
      addLog('读取邮件失败: ' + error.message, 'error');
      emailCodeResult.style.display = 'block';
      emailCodeContent.innerHTML = `<div style="color: #ff6b6b;">读取失败: ${error.message}</div>`;
    }
  });

  toggleSimulate.addEventListener('click', () => {
    toggleSimulate.classList.toggle('active');
    updateSettings();
  });

  function updateSettings() {
    chrome.storage.local.get(['ppSettings'], (result) => {
      const settings = result.ppSettings || {};
      settings.autoSimulate = toggleSimulate.classList.contains('active');
      settings.phone = ppPhone.value || '+15828882140';
      chrome.storage.local.set({ ppSettings: settings });
    });
  }

  [ppPhone].forEach(el => {
    el.addEventListener('change', updateSettings);
  });

  addLog('插件已就绪', 'success');
});

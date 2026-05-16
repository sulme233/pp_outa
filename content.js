(() => {
  let 正在输入 = false
  let 请求停止 = false

  const 普通字符最小延迟 = 50
  const 普通字符最大延迟 = 160
  const 换行最小延迟 = 80
  const 换行最大延迟 = 220

  const 支持的输入类型 = new Set([
    'text',
    'search',
    'email',
    'url',
    'tel',
    'password',
    'number'
  ])

  function 是否可输入元素(元素) {
    if (!元素 || !(元素 instanceof Element)) {
      return false
    }

    const 当前元素 = 元素.closest('input, textarea, [contenteditable="true"], [contenteditable=""]')

    if (!当前元素) {
      return false
    }

    if (当前元素 instanceof HTMLTextAreaElement) {
      return !当前元素.disabled && !当前元素.readOnly
    }

    if (当前元素 instanceof HTMLInputElement) {
      const 类型 = (当前元素.getAttribute('type') || 'text').toLowerCase()
      return 支持的输入类型.has(类型) && !当前元素.disabled && !当前元素.readOnly
    }

    if (当前元素.isContentEditable) {
      return true
    }

    return false
  }

  function 获取可输入元素(元素) {
    if (!元素 || !(元素 instanceof Element)) {
      return null
    }

    const 当前元素 = 元素.closest('input, textarea, [contenteditable="true"], [contenteditable=""]')

    if (是否可输入元素(当前元素)) {
      return 当前元素
    }

    return null
  }

  function 等待(毫秒) {
    return new Promise((resolve) => {
      window.setTimeout(resolve, 毫秒)
    })
  }

  function 随机延迟(最小值, 最大值) {
    return Math.floor(Math.random() * (最大值 - 最小值 + 1)) + 最小值
  }

  function 触发输入事件(元素, 文字) {
    元素.dispatchEvent(new InputEvent('input', {
      bubbles: true,
      cancelable: false,
      inputType: 文字 === '\n' || 文字 === '\r' ? 'insertLineBreak' : 'insertText',
      data: 文字
    }))
  }

  function 触发修改事件(元素) {
    元素.dispatchEvent(new Event('change', {
      bubbles: true,
      cancelable: false
    }))
  }

  function 设置原生值(元素, 值) {
    const 原型 = 元素 instanceof HTMLTextAreaElement
      ? HTMLTextAreaElement.prototype
      : HTMLInputElement.prototype

    const 描述符 = Object.getOwnPropertyDescriptor(原型, 'value')

    if (描述符 && typeof 描述符.set === 'function') {
      描述符.set.call(元素, 值)
    } else {
      元素.value = 值
    }
  }

  function 插入到普通输入框(元素, 文字) {
    const 原值 = 元素.value
    const 开始位置 = typeof 元素.selectionStart === 'number'
      ? 元素.selectionStart
      : 原值.length
    const 结束位置 = typeof 元素.selectionEnd === 'number'
      ? 元素.selectionEnd
      : 原值.length

    const 新值 = 原值.slice(0, 开始位置) + 文字 + 原值.slice(结束位置)
    const 新光标位置 = 开始位置 + 文字.length

    元素.focus()
    设置原生值(元素, 新值)

    try {
      元素.setSelectionRange(新光标位置, 新光标位置)
    } catch (错误) {
      try {
        元素.selectionStart = 新光标位置
        元素.selectionEnd = 新光标位置
      } catch (内部错误) {}
    }

    触发输入事件(元素, 文字)
    触发修改事件(元素)
  }

  function 插入到可编辑元素(元素, 文字) {
    元素.focus()

    const 选择 = window.getSelection()

    if (!选择 || 选择.rangeCount === 0 || !元素.contains(选择.anchorNode)) {
      const 范围 = document.createRange()
      范围.selectNodeContents(元素)
      范围.collapse(false)

      if (选择) {
        选择.removeAllRanges()
        选择.addRange(范围)
      }
    }

    const 成功 = document.execCommand('insertText', false, 文字)

    if (!成功) {
      const 当前选择 = window.getSelection()

      if (当前选择 && 当前选择.rangeCount > 0) {
        const 范围 = 当前选择.getRangeAt(0)
        范围.deleteContents()

        const 文本节点 = document.createTextNode(文字)
        范围.insertNode(文本节点)

        范围.setStartAfter(文本节点)
        范围.setEndAfter(文本节点)

        当前选择.removeAllRanges()
        当前选择.addRange(范围)
      }
    }

    触发输入事件(元素, 文字)
  }

  function 插入文字(元素, 文字) {
    if (!元素 || 文字 === '') {
      return
    }

    if (元素 instanceof HTMLInputElement || 元素 instanceof HTMLTextAreaElement) {
      插入到普通输入框(元素, 文字)
      return
    }

    if (元素.isContentEditable) {
      插入到可编辑元素(元素, 文字)
    }
  }

  async function 开始逐字输入(文本, 元素) {
    if (正在输入 || !文本 || !元素) {
      return
    }

    正在输入 = true
    请求停止 = false

    try {
      元素.focus()

      for (const 字符 of 文本) {
        if (请求停止 || !正在输入) {
          break
        }

        插入文字(元素, 字符)

        const 是否换行 = 字符 === '\n' || 字符 === '\r'
        const 延迟 = 是否换行
          ? 随机延迟(换行最小延迟, 换行最大延迟)
          : 随机延迟(普通字符最小延迟, 普通字符最大延迟)

        await 等待(延迟)
      }
    } finally {
      正在输入 = false
      请求停止 = false
    }
  }

  document.addEventListener('paste', (事件) => {
    const 元素 = 获取可输入元素(事件.target)

    if (!元素) {
      return
    }

    if (正在输入) {
      事件.preventDefault()
      事件.stopPropagation()
      return
    }

    const 剪贴板数据 = 事件.clipboardData || window.clipboardData
    const 文本 = 剪贴板数据 ? 剪贴板数据.getData('text/plain') : ''

    if (!文本) {
      return
    }

    事件.preventDefault()
    事件.stopPropagation()

    开始逐字输入(文本, 元素)
  }, true)

  document.addEventListener('keydown', (事件) => {
    if (事件.key === 'Escape' && 正在输入) {
      请求停止 = true
      正在输入 = false
    }
  }, true)
})()

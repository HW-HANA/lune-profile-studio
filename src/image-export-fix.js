/* Lune image export repair. Local dependencies only; no photo leaves the device. */
(function (global) {
  'use strict';

  const LIMIT = { imageSide: 1800, exportSide: 4096, exportPixels: 8000000, timeout: 20000 };
  let exporting = false;

  function deadline(promise, message, milliseconds) {
    let timer;
    return Promise.race([
      promise,
      new Promise((_, reject) => { timer = setTimeout(() => reject(new Error(message)), milliseconds || LIMIT.timeout); })
    ]).finally(() => clearTimeout(timer));
  }

  async function waitImage(image, label) {
    if (!(image.complete && image.naturalWidth > 0 && image.naturalHeight > 0)) {
      await deadline(new Promise((resolve, reject) => {
        const cleanup = () => { image.removeEventListener('load', loaded); image.removeEventListener('error', failed); };
        const loaded = () => { cleanup(); resolve(); };
        const failed = () => { cleanup(); reject(new Error((label || '图片') + '读取失败，请重新选择图片')); };
        image.addEventListener('load', loaded, { once: true });
        image.addEventListener('error', failed, { once: true });
        if (image.complete) image.naturalWidth > 0 ? loaded() : failed();
      }), (label || '图片') + '加载超时，请重试');
    }
    if (typeof image.decode === 'function') {
      // Some WebViews reject decode() even after a successful image load.
      try { await deadline(image.decode(), '图片解码超时'); }
      catch (error) { if (!(image.complete && image.naturalWidth > 0)) throw error; }
    }
    if (!(image.naturalWidth > 0 && image.naturalHeight > 0)) throw new Error('图片尺寸无效，请重新选择图片');
    return image;
  }

  async function loadImage(source, label) {
    const image = new Image();
    image.decoding = 'sync';
    if (/^https?:/i.test(source)) image.crossOrigin = 'anonymous';
    const loading = new Promise((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error((label || '图片') + '读取失败，请重新选择图片'));
    });
    image.src = source;
    await deadline(loading, (label || '图片') + '加载超时，请重试');
    await waitImage(image, label);
    image.onload = image.onerror = null;
    return image;
  }

  function createCanvas(width, height) {
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(width));
    canvas.height = Math.max(1, Math.round(height));
    const context = canvas.getContext('2d');
    if (!context) throw new Error('图片内存不足，请关闭其他页面后重试');
    return { canvas, context };
  }

  function encode(canvas, type, quality) {
    let result;
    try { result = canvas.toDataURL(type || 'image/png', quality); }
    catch (error) { throw new Error('图片无法生成，请减小图片或选择标准清晰度后重试'); }
    if (!/^data:image\/(png|jpeg);base64,[A-Za-z0-9+/=]+$/.test(result)) {
      throw new Error('图片生成失败，请选择标准清晰度后重试');
    }
    return result;
  }

  function fitRect(imageWidth, imageHeight, width, height, fit, position) {
    const tokens = String(position || '50% 50%').trim().split(/\s+/);
    function offset(token, remaining, axis) {
      const keywords = axis === 0 ? { left: 0, center: 0.5, right: 1 } : { top: 0, center: 0.5, bottom: 1 };
      if (Object.prototype.hasOwnProperty.call(keywords, token)) return remaining * keywords[token];
      const value = parseFloat(token);
      if (!Number.isFinite(value)) return remaining / 2;
      return /%$/.test(token) ? remaining * value / 100 : value;
    }
    let drawWidth = width, drawHeight = height;
    if (fit !== 'fill') {
      let scale = fit === 'cover' ? Math.max(width / imageWidth, height / imageHeight) : Math.min(width / imageWidth, height / imageHeight);
      if (fit === 'none') scale = 1;
      if (fit === 'scale-down') scale = Math.min(1, scale);
      drawWidth = imageWidth * scale;
      drawHeight = imageHeight * scale;
    }
    return { x: offset(tokens[0], width - drawWidth, 0), y: offset(tokens[1] || '50%', height - drawHeight, 1), width: drawWidth, height: drawHeight };
  }

  function rasterImage(image, width, height, style, ratio) {
    const sizeRatio = Math.min(ratio || 1, LIMIT.exportSide / Math.max(width, height), Math.sqrt(LIMIT.exportPixels / (width * height)));
    const { canvas, context } = createCanvas(width * sizeRatio, height * sizeRatio);
    context.scale(canvas.width / width, canvas.height / height);
    const rect = fitRect(image.naturalWidth, image.naturalHeight, width, height, style.objectFit || 'fill', style.objectPosition);
    const nativeFilter = 'filter' in context;
    if (nativeFilter && style.filter && style.filter !== 'none') context.filter = style.filter;
    context.drawImage(image, rect.x, rect.y, rect.width, rect.height);
    const saturation = !nativeFilter && String(style.filter || '').match(/^saturate\(([\d.]+)\)$/);
    if (saturation) {
      const pixels = context.getImageData(0, 0, canvas.width, canvas.height);
      const amount = Number(saturation[1]);
      for (let index = 0; index < pixels.data.length; index += 4) {
        const red = pixels.data[index], green = pixels.data[index + 1], blue = pixels.data[index + 2];
        const gray = 0.213 * red + 0.715 * green + 0.072 * blue;
        pixels.data[index] = gray + amount * (red - gray);
        pixels.data[index + 1] = gray + amount * (green - gray);
        pixels.data[index + 2] = gray + amount * (blue - gray);
      }
      context.putImageData(pixels, 0, 0);
    }
    // Native Canvas does not support CSS object-fit: crop before the export renderer sees it.
    const result = encode(canvas);
    canvas.width = canvas.height = 1;
    return result;
  }

  function exportSize(width, height, requestedWidth) {
    if (![width, height, requestedWidth].every(n => Number.isFinite(n) && n > 0)) throw new Error('画布尺寸无效，请返回编辑器重试');
    const ratio = Math.min(requestedWidth / width, LIMIT.exportSide / width, LIMIT.exportSide / height, Math.sqrt(LIMIT.exportPixels / (width * height)));
    return { scale: ratio, width: Math.max(1, Math.floor(width * ratio)), height: Math.max(1, Math.floor(height * ratio)) };
  }

  async function normalizeUpload(file) {
    const type = String(file.type || '').toLowerCase();
    if (!/^image\/(jpeg|png|webp|gif)$/.test(type) && !(type === '' && /\.(jpe?g|png|webp|gif)$/i.test(file.name || ''))) {
      throw new Error('请选择 JPG、PNG、WebP 或 GIF 图片');
    }
    if (file.size > 15 * 1024 * 1024) throw new Error('图片不能超过 15 MB');
    const source = await deadline(new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error('图片读取失败，请重新选择'));
      reader.readAsDataURL(file);
    }), '图片读取超时，请重试');
    const image = await loadImage(source, '上传图片');
    const scale = Math.min(1, LIMIT.imageSide / Math.max(image.naturalWidth, image.naturalHeight));
    const { canvas, context } = createCanvas(image.naturalWidth * scale, image.naturalHeight * scale);
    try {
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      const result = encode(canvas, type === 'image/png' || /\.png$/i.test(file.name || '') ? 'image/png' : 'image/jpeg', 0.88);
      await loadImage(result, '处理后的图片');
      return result;
    } finally { canvas.width = canvas.height = 1; }
  }

  async function prepareStage(node, project, fullCanvas) {
    const host = document.createElement('div');
    const stage = node.cloneNode(true);
    const inherited = getComputedStyle(node);
    const theme = node.closest('[data-theme]');
    host.className = fullCanvas ? 'lune-render-host' : 'lune-render-host export-canvas';
    if (theme) host.setAttribute('data-theme', theme.getAttribute('data-theme'));
    host.setAttribute('aria-hidden', 'true');
    host.style.cssText = 'position:absolute;left:0;top:0;z-index:-2147483647;pointer-events:none;display:block;overflow:visible;background:none;box-shadow:none;border-radius:0;';
    for (let index = 0; index < inherited.length; index++) {
      const property = inherited[index];
      if (property.startsWith('--')) host.style.setProperty(property, inherited.getPropertyValue(property));
    }
    for (const property of ['font-family', 'font-size', 'font-weight', 'font-style', 'line-height', 'letter-spacing', 'color']) {
      host.style.setProperty(property, inherited.getPropertyValue(property));
    }
    stage.removeAttribute('id');
    stage.style.transform = 'none';
    stage.style.margin = '0';
    stage.style.boxShadow = 'none';
    stage.style.width = (fullCanvas ? 540 : node.offsetWidth) + 'px';
    if (fullCanvas) stage.style.height = (540 * project.canvas.height / project.canvas.width) + 'px';
    host.style.width = stage.style.width;
    if (fullCanvas) stage.style.borderRadius = '0';
    for (const element of stage.querySelectorAll('[id]')) element.removeAttribute('id');
    if (project.chat && !project.chat.showTimestamp) {
      for (const element of stage.querySelectorAll('.message-time')) element.remove();
    }
    host.appendChild(stage);
    document.body.appendChild(host);
    return { host, stage };
  }

  async function exportNode(node, project, format, multiplier, fullCanvas) {
    if (exporting) throw new Error('图片正在生成，请稍候');
    if (!node) throw new Error('请先返回编辑器再导出');
    if (typeof global.html2canvas !== 'function') throw new Error('图片组件未加载，请重新打开工具');
    exporting = true;
    let host, output;
    try {
      if (document.fonts && document.fonts.ready) await deadline(document.fonts.ready, '字体加载超时，请重试');
      const prepared = await prepareStage(node, project, fullCanvas);
      host = prepared.host;
      const stage = prepared.stage;
      if (format === 'jpg') stage.style.borderRadius = '0';
      const width = fullCanvas ? 540 : node.offsetWidth;
      const height = fullCanvas ? 540 * project.canvas.height / project.canvas.width : stage.offsetHeight;
      const size = exportSize(width, height, Number(project.canvas.width) * Number(multiplier));
      for (const svg of stage.querySelectorAll('svg')) {
        // SVG icons otherwise lose inherited currentColor when serialized by the renderer.
        svg.setAttribute('color', getComputedStyle(svg).color);
      }
      // Sequential decoding bounds mobile memory; no failed image is replaced by an empty URL.
      for (const image of stage.querySelectorAll('img')) {
        image.loading = 'eager';
        await waitImage(image, image.alt);
        const style = getComputedStyle(image);
        const imageWidth = parseFloat(style.width) || image.clientWidth;
        const imageHeight = parseFloat(style.height) || image.clientHeight;
        if (!(imageWidth > 0 && imageHeight > 0)) continue;
        const matrix = String(style.transform || '').match(/^matrix\(([^)]+)\)$/);
        const zoom = matrix ? Math.max(Math.abs(parseFloat(matrix[1])), Math.abs(parseFloat(matrix[1].split(',')[3]))) : 1;
        const source = rasterImage(image, imageWidth, imageHeight, style, size.scale * Math.max(1, zoom || 1));
        image.removeAttribute('srcset');
        image.style.objectFit = 'fill';
        image.style.objectPosition = '50% 50%';
        image.style.filter = 'none';
        image.src = source;
        await waitImage(image, image.alt);
      }
      // User-selected canvas backgrounds are also decoded to local PNG bytes before rendering.
      const background = fullCanvas && stage.style.backgroundImage;
      const backgroundURL = background && background.match(/^url\(["']?(.+?)["']?\)$/);
      if (backgroundURL) {
        const image = await loadImage(backgroundURL[1], '画布背景');
        const source = rasterImage(image, width, height, { objectFit: 'cover', objectPosition: '50% 50%' }, size.scale);
        stage.style.backgroundImage = 'url("' + source + '")';
      }
      const backgroundColor = fullCanvas ? project.canvas.background : format === 'jpg' ? getComputedStyle(stage).backgroundColor : null;
      // Use native Canvas painting, bypassing SVG foreignObject image decoding on iOS.
      output = await global.html2canvas(stage, {
        backgroundColor, scale: size.scale, width, height,
        allowTaint: false, useCORS: true, foreignObjectRendering: false,
        imageTimeout: LIMIT.timeout, logging: false, removeContainer: true,
        scrollX: 0, scrollY: 0
      });
      if (!(output.width > 0 && output.height > 0) || output.width * output.height > LIMIT.exportPixels + LIMIT.exportSide) {
        throw new Error('图片尺寸异常，请选择标准清晰度后重试');
      }
      const result = encode(output, format === 'jpg' ? 'image/jpeg' : 'image/png', 0.96);
      return { image: result, width: output.width, height: output.height };
    } finally {
      if (output) output.width = output.height = 1;
      if (host) host.remove();
      exporting = false;
    }
  }

  global.LuneImageFix = Object.freeze({ exportNode, normalizeUpload, version: '2.1.0', fitRect, exportSize });
})(typeof window === 'undefined' ? globalThis : window);

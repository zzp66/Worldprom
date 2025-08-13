(()=> {
  const params = new URLSearchParams(location.search);
  const heroHandle = params.get('hero');
  if (!heroHandle) return;

  // ==== 选择器适配（Ascension / 大多数OS2.0主题通用） ====
  // 网格容器候选
  const grid =
    document.querySelector('#product-grid') ||
    document.querySelector('.product-grid, [data-product-grid], .collection__product-grid, .collection-grid, [data-section-type="collection"] .grid');

  if (!grid) return;

  // 单个卡片的最近容器选择器集合
  const cardClosestSelectors = [
    'li.grid__item', '.grid__item', '.product-card', '.product-item', '.card-wrapper', 'li'
  ];

  // 在文档或传入的doc里查找目标卡片
  function findCard(root=document) {
    const link = root.querySelector(`a[href*="/products/${CSS.escape(heroHandle)}"]`);
    if (!link) return null;
    for (const sel of cardClosestSelectors) {
      const card = link.closest(sel);
      if (card) return card;
    }
    return link.closest('div, li');
  }

  // 将卡片安全地插入到网格第一位
  function pinToTop(cardNode) {
    if (!cardNode || !grid) return;
    const first = grid.firstElementChild;
    if (first && first === cardNode) return;
    grid.insertBefore(cardNode, first);
    // 可选：给置顶卡片加一个轻微高亮（10秒消退）
    cardNode.style.animation = 'heroPulse 10s ease 1';
    const style = document.createElement('style');
    style.textContent = `
      @keyframes heroPulse { 0% {outline:2px solid rgba(0,0,0,.12)} 100% {outline:0} }
    `;
    document.head.appendChild(style);
  }

  // 先查当前页
  const current = findCard(document);
  if (current) { pinToTop(current); return; }

  // 处理分页：如果主题是“加载更多/无限滚动”，等待网格追加后再尝试
  const hasInfinite = !!document.querySelector('[data-infinite-scroll], .js-infinite-scroll, button.load-more, a.load-more');
  if (hasInfinite) {
    // 监听后续追加
    const mo = new MutationObserver(() => {
      const c = findCard(document);
      if (c) { pinToTop(c); mo.disconnect(); }
    });
    mo.observe(grid, { childList: true, subtree: true });
    // 同时尝试触发一次“加载更多”（如果按钮存在且可视）
    const trigger = document.querySelector('button.load-more, a.load-more');
    if (trigger && trigger.click) trigger.click();
    return;
  }

  // 如果是传统分页，尝试抓取后续页HTML并抽出目标卡片
  function getMaxPage() {
    // 1) 从“最后一页”链接识别
    const last = document.querySelector('nav.pagination a[rel="last"], nav.pagination a[aria-label="Last"]');
    if (last && last.href) {
      const u = new URL(last.href);
      return Number(u.searchParams.get('page')) || 1;
    }
    // 2) 兜底：从页码按钮文本取最大数字
    let max = 1;
    document.querySelectorAll('nav.pagination a, nav.pagination button, .pagination__item').forEach(el => {
      const n = Number(el.textContent.trim());
      if (!isNaN(n)) max = Math.max(max, n);
    });
    return max;
  }

  async function fetchHeroCardFromPage(page) {
    const url = new URL(location.href);
    url.searchParams.set('page', page);
    // 保留原有筛选/排序参数，同时保留 ?hero=
    const res = await fetch(url.toString(), { credentials: 'same-origin' });
    if (!res.ok) return null;
    const html = await res.text();
    const dom = new DOMParser().parseFromString(html, 'text/html');
    return findCard(dom);
  }

  (async () => {
    const max = getMaxPage();
    for (let p = 2; p <= max; p++) {
      try {
        const card = await fetchHeroCardFromPage(p);
        if (card) { pinToTop(card); return; }
      } catch (e) { /* 忽略单页错误 */ }
    }
    // 找不到：可能 handle 不在该集合或拼写不一致
  })();
})();
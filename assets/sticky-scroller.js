/**
 *  @class
 *  @function StickyScroller
 */
if (!customElements.get('sticky-scroller')) {
  class StickyScroller extends HTMLElement {

    constructor() {
      super();
      this.headerHeight = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--header-height'), 10) + parseInt(getComputedStyle(document.documentElement).getPropertyValue('--header-offset'), 10);
      this.parent = this.closest('.sticky-scroller--parent');
      this.newScrollPosition = 0;
      this.oldScrollPositon = 0;
      this.ticking = false;
    }

    connectedCallback() {
      if (!this.parent) {
        return;
      }
      this.element = this.querySelector('.sticky-scroller--element');
      this.siblings = this.parent.querySelectorAll('.sticky-scroller--compare');
      this.collapsibles = this.parent.querySelectorAll('.accordion');

      window.addEventListener('resize', this.onResize.bind(this));
      window.addEventListener('scroll', this.onScroll.bind(this), {
        passive: true
      });
      window.dispatchEvent(new Event('resize'));
      if (this.collapsibles.length) {
        this.collapsibles.forEach((collapsible) => {
          collapsible.addEventListener('animationend', () => { this.onResize(); });
        });
      }
    }

    getSiblingsHeight() {
      this.disable(false);
      this.siblingHeight = 0;
      this.siblings.forEach((sibling) => {
        this.siblingHeight += sibling.offsetHeight;
      });
      return this.siblingHeight;
    }
    onResize() {
      if (this.getSiblingsHeight()) {
        if (this.getSiblingsHeight() <= this.element.offsetHeight) {
          this.disable(true);
        } else {
          this.activate();
        }
      }
    }
    onScroll() {
      this.newScrollPosition = window.scrollY;

      if (!this.ticking) {
        window.requestAnimationFrame(() => {
          this.translate();
          this.ticking = false;
          this.oldScrollPositon = this.newScrollPosition;
        });

        this.ticking = true;
      }
    }
    activate() {
      this.element.style.overflowY = 'hidden';
      this.element.classList.remove('sticky-scroller--disabled');

      this.ticking = false;
      window.dispatchEvent(new Event('scroll'));
    }
    disable(scroll) {
      if (scroll) {
        this.element.style.overflowY = 'auto';
      }
      this.element.classList.add('sticky-scroller--disabled');
    }
    translate() {
      const parentRect = this.parentElement.getBoundingClientRect();
      const distance = this.newScrollPosition - this.oldScrollPositon;
      // Do not scroll up before sticky period
      if (parentRect.top > this.headerHeight && distance > 0) {
        return;
      }
      // Do not scroll down after sticky period
      if (parentRect.bottom < window.innerHeight && distance < 0) {
        return;
      }
      this.element.scrollTop += distance;
    }
  }
  customElements.define('sticky-scroller', StickyScroller);
}
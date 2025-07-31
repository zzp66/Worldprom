if (typeof debounce === 'undefined') {
  function debounce(fn, wait) {
    let t;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn.apply(this, args), wait);
    };
  }
}
/**
 *  @class
 *  @function StickyHeader
 */
if (!customElements.get('sticky-header')) {
  class StickyHeader extends HTMLElement {
    constructor() {
      super();
    }
    connectedCallback() {
      this.headerBounds = {};
      this.header = this.querySelector('theme-header');
      this.section = this.closest('.section-header-section');
      this.currentScrollTop = 0;
      this.preventReveal = 0;
      this.onScrollHandler = this.onScroll.bind(this);

      window.addEventListener('scroll', this.onScrollHandler, false);
      this.createObserver();
    }
    disconnectedCallback() {
      window.removeEventListener('scroll', this.onScrollHandler);
    }
    createObserver() {
      new IntersectionObserver((entries, observer) => {
        const entry = entries[0];
        this.headerBounds = entry.intersectionRect;

        if (this.headerBounds.top === 0 && this.headerBounds.bottom === 0) {
          const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
          const boundingClientRect = entry.boundingClientRect;

          this.headerBounds = {
            top: scrollTop + boundingClientRect.top,
            bottom: scrollTop + boundingClientRect.bottom,
          };
        }

        observer.disconnect();
      }).observe(this.header);
    }
    onScroll() {
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;

      if (scrollTop > this.currentScrollTop && scrollTop > this.headerBounds.bottom) {
        requestAnimationFrame(this.hide.bind(this));
      } else if (scrollTop < this.currentScrollTop && scrollTop > this.headerBounds.bottom) {
        requestAnimationFrame(this.show.bind(this));
      } else if (scrollTop <= this.headerBounds.top) {
        requestAnimationFrame(this.reset.bind(this));
      }


      this.currentScrollTop = scrollTop;
    }

    hide() {
      this.section.classList.add(
        'section-header-section--is-hidden',
        'section-header-section--is-sticky'
      );
      this.header.classList.remove('is-sticky');
    }

    show() {
      this.section.classList.add('section-header-section--is-sticky', 'section-header-section--animate');
      this.section.classList.remove('section-header-section--is-hidden');
      this.header.classList.add('is-sticky');
    }

    reset() {
      this.section.classList.remove(
        'section-header-section--is-hidden',
        'section-header-section--is-sticky',
        'section-header-section--animate'
      );
      this.header.classList.remove('is-sticky');
    }
  }
  customElements.define('sticky-header', StickyHeader);
}
/**
 *  @class
 *  @function ThemeHeader
 */
if (!customElements.get('theme-header')) {
  class ThemeHeader extends HTMLElement {
    constructor() {
      super();
    }
    connectedCallback() {
      this.header_section = document.querySelector('.section-header-section');
      this.menu = this.querySelector('#mobile-menu');
      this.toggle = document.querySelector('.mobile-toggle-wrapper');
      this.search_toggles = document.querySelectorAll('.thb-quick-search');
      this.search_drawer = document.getElementById('Search-Drawer');
      const body = document.body;
      document.addEventListener('keyup', (e) => {
        if (e.code) {
          if (e.code.toUpperCase() === 'ESCAPE') {
            this.toggle.removeAttribute('open');
            this.toggle.classList.remove('active');
            this.querySelectorAll('details').forEach((detailsElement) => {
              this.closeSubmenu(detailsElement);
            });
          }
        }
      });

      // Search toggle
      this.search_toggles.forEach((item, i) => {
        item.addEventListener('click', (e) => {
          e.preventDefault();

          body.classList.add('open-cc', 'overflow-hidden');
          this.search_drawer.classList.toggle('active');
          setTimeout(() => {
            this.search_drawer.querySelector('input[type="search"]').focus({
              preventScroll: true
            });
          }, 100);
          dispatchCustomEvent('search:open');
          this.search_drawer.removeAttribute('inert');
        });
      });
      // Mobile menu toggles
      const toggleClass = this.toggle.classList;
      this.toggle.querySelector('.mobile-toggle').addEventListener('click', (e) => {
        if (toggleClass.contains('active')) {
          e.preventDefault();
          body.classList.remove('overflow-hidden');
          toggleClass.remove('active');
          this.closeAnimation(this.toggle);
          setTimeout(() => {
            this.closeAll();
          }, 250);
        } else {
          body.classList.add('overflow-hidden');
          setTimeout(() => {
            toggleClass.add('active');
          });
        }
        window.dispatchEvent(new Event('resize-select'));
      });

      // Mobile Menu offset
      window.addEventListener('scroll', this.setHeaderOffset.bind(this), {
        passive: true
      });
      window.addEventListener('resize', this.setHeaderOffset.bind(this));
      window.addEventListener('scroll', this.setHeaderHeight.bind(this), {
        passive: true
      });

      window.dispatchEvent(new Event('scroll'));

      if (document.querySelector('.header-announcement-bar')) {

        window.addEventListener('scroll', this.setAnnouncementHeight(), {
          passive: true
        });
        window.dispatchEvent(new Event('resize'));
      }

      // Mobile Menu Buttons.
      this.menu.querySelectorAll('summary').forEach(summary => summary.addEventListener('click', this.onSummaryClick.bind(this)));
      this.menu.querySelectorAll('.parent-link-back--button').forEach(button => button.addEventListener('click', this.onCloseButtonClick.bind(this)));
    }

    setAnnouncementHeight() {
      const a_bar = document.querySelector('.header-announcement-bar');
      if (a_bar) {
        let h = a_bar.clientHeight;
        document.documentElement.style.setProperty('--announcement-height', h + 'px');
      }
    }
    setHeaderOffset() {
      let h = window.innerWidth > 768 ? this.header_section.getBoundingClientRect().top : 0,
        has_a = this.header_section.previousElementSibling.classList.contains('header-announcement-bar'),
        a = has_a ? parseInt(getComputedStyle(document.documentElement).getPropertyValue('--announcement-height'), 10) : 0;

      if (h >= 0) {
        document.documentElement.style.setProperty('--header-offset', h + 'px');
      }
    }
    setHeaderHeight() {
      let h = this.header_section.clientHeight;
      document.documentElement.style.setProperty('--header-height', h + 'px');
    }
    closeAll() {
      this.querySelectorAll('details').forEach((detailsElement) => {
        this.closeSubmenu(detailsElement);
      });
    }
    onSummaryClick(event) {
      const summaryElement = event.currentTarget;
      const detailsElement = summaryElement.parentNode;
      const parentMenuElement = detailsElement.closest('.link-container');

      if (this.querySelector('.parent-link-back--button')) {
        this.menu.scrollTop = 0;
      }

      setTimeout(() => {
        detailsElement.classList.add('menu-opening');
        parentMenuElement && parentMenuElement.classList.add('submenu-open');
      }, 100);
    }
    onCloseButtonClick(event) {
      event.preventDefault();
      const detailsElement = event.currentTarget.closest('details');
      this.closeSubmenu(detailsElement);
    }
    closeSubmenu(detailsElement) {
      detailsElement.classList.remove('menu-opening');
      this.closeAnimation(detailsElement);
    }
    closeAnimation(detailsElement) {
      let animationStart;

      const handleAnimation = (time) => {
        if (animationStart === undefined) {
          animationStart = time;
        }

        const elapsedTime = time - animationStart;

        if (elapsedTime < 400) {
          window.requestAnimationFrame(handleAnimation);
        } else {
          detailsElement.removeAttribute('open');
        }
      };

      window.requestAnimationFrame(handleAnimation);
    }
  }
  customElements.define('theme-header', ThemeHeader);
}
/**
 *  @class
 *  @function FullMenu
 */
if (!customElements.get('full-menu')) {
  class FullMenu extends HTMLElement {
    constructor() {
      super();
    }
    connectedCallback() {
      this.header = this.closest('.header');
      this.all_subs = this.querySelectorAll('.menu-item-has-children');
      this.submenus = this.querySelectorAll('.thb-full-menu>.menu-item-has-children:not(.menu-item-has-megamenu)>.sub-menu');

      if (!this.submenus.length) {
        return;
      }
      const _this = this;
      // resize on initial load
      window.addEventListener('resize', debounce(function () {
        _this.resizeSubMenus();
      }, 100));

      window.dispatchEvent(new Event('resize'));

      document.fonts.ready.then(function () {
        _this.resizeSubMenus();
      });

      this.all_subs.forEach((subs) => {
        subs.addEventListener('mouseenter', () => {
          this.header.classList.add('menu-item-hover');
        });
        subs.addEventListener('mouseleave', () => {
          this.header.classList.remove('menu-item-hover');
        });
      });
    }
    resizeSubMenus() {
      this.submenus.forEach((submenu) => {
        let sub_submenus = submenu.querySelectorAll(':scope >.menu-item-has-children>.sub-menu');

        sub_submenus.forEach((sub_submenu) => {
          let w = sub_submenu.offsetWidth,
            l = sub_submenu.parentElement.parentElement.getBoundingClientRect().left + sub_submenu.parentElement.parentElement.clientWidth + 10,
            total = w + l;
          if (total > document.body.clientWidth) {
            sub_submenu.parentElement.classList.add('left-submenu');
          } else if (sub_submenu.parentElement.classList.contains('left-submenu')) {
            sub_submenu.parentElement.classList.remove('left-submenu');
          }
        });
      });
    }
  }
  customElements.define('full-menu', FullMenu);
}
if (!customElements.get('product-slider-thumbnails')) {
  /**
   *  @class
   *  @function ProductSliderThumbnails
   */
  class ProductSliderThumbnails extends HTMLElement {
    constructor() {
      super();

      this.addEventListener('change', this.setupProductGallery);
    }
    connectedCallback() {
      this.product_container = this.closest('.thb-product-detail');
      this.quickView = this.closest('#Product-Drawer-Content');
      this.thumbnail_container = this.product_container.querySelector('.product-thumbnail-container');
      this.video_containers = this.querySelectorAll('.product-single__media-external-video--play');

      this.setOptions();
      this.setupThumbnailNav();
      this.setupVideoAutoplay();

      // Product page on mobile: native swipe gallery (same as the grid layout) instead of Flickity
      this.mobileQuery = this.mobileQuery || window.matchMedia('(max-width: 1067px)');
      if (!this._mobileQueryBound && !this.quickView && !this.closest('.featured-product')) {
        this._mobileQueryBound = true;
        this.mobileQuery.addEventListener('change', () => {
          if (this.isNativeMode()) {
            if (this.flkty) {
              this.flkty.destroy();
              this.flkty = null;
            }
          } else if (!this.flkty) {
            this.init();
          }
        });
      }
      if (this.isNativeMode()) {
        this.setupProductGallery();
        return;
      }

      // Start Slider
      this.init();
    }
    // Desktop up/down buttons for the vertical thumbnail column (product pages only)
    setupThumbnailNav() {
      let container = this.thumbnail_container,
        nav = this.product_container?.querySelector('.product-thumbnails-nav');
      if (!container || !nav || nav.dataset.bound) return;
      nav.dataset.bound = 'true';

      let prev = nav.querySelector('[name="thumbs-prev"]'),
        next = nav.querySelector('[name="thumbs-next"]'),
        frame = null;

      let update = () => {
        frame = null;
        let max = container.scrollHeight - container.clientHeight;
        prev.disabled = container.scrollTop <= 1;
        next.disabled = max <= 1 || container.scrollTop >= max - 1;
      };
      let requestUpdate = () => {
        if (!frame) frame = requestAnimationFrame(update);
      };
      let step = (direction) => {
        container.scrollBy({
          top: direction * container.clientHeight * 0.8,
          behavior: 'smooth'
        });
      };

      prev.addEventListener('click', () => step(-1));
      next.addEventListener('click', () => step(1));
      container.addEventListener('scroll', requestUpdate, { passive: true });
      new ResizeObserver(requestUpdate).observe(container);
      update();
    }
    // Native videos play muted once at least half is on screen (page scroll or slide change) and pause when they leave
    setupVideoAutoplay() {
      if (this.quickView || !('IntersectionObserver' in window)) return;

      this.videoObserver = this.videoObserver || new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          let video = entry.target;
          if (entry.isIntersecting) {
            video.play().catch(() => {});
          } else if (!video.paused) {
            video.pause();
          }
        });
      }, { threshold: 0.5 });

      // connectedCallback runs again after color filtering, so each video is only bound once
      this.querySelectorAll('.product-single__media-native-video video').forEach((video) => {
        if (video.dataset.autoplayBound) return;
        video.dataset.autoplayBound = 'true';
        video.muted = true;
        this.videoObserver.observe(video);
      });
    }
    isNativeMode() {
      return this.mobileQuery.matches && !this.quickView && !this.closest('.featured-product');
    }
    setOptions() {
      this.hide_variants = this.dataset.hideVariants == 'true';
      this.thumbnails = this.thumbnail_container?.querySelectorAll('.product-thumbnail');
      this.prev_button = this.querySelector('.flickity-prev');
      this.next_button = this.querySelector('.flickity-next');
      this.options = {
        wrapAround: true,
        pageDots: false,
        contain: true,
        cellAlign: this.quickView ? 'left' : 'center',
        adaptiveHeight: true,
        initialIndex: '.is-initial-selected',
        prevNextButtons: false,
        fade: false,
        cellSelector: '.product-images__slide.is-active'
      };

      if (this.quickView) {
        this.options.wrapAround = false;
      }
    }
    init() {
      this.flkty = new Flickity(this, this.options);
      this.dataset.flkty = this.flkty;
      this.selectedIndex = this.flkty.selectedIndex;

      // Setup Events
      this.setupEvents();

      // Start Gallery
      this.setupProductGallery();
    }
    reInit(imageSetIndex) {

      this.flkty.destroy();

      this.setOptions();

      this.flkty = new Flickity(this, this.options);

      // Setup Events
      this.setupEvents();

      this.selectedIndex = this.flkty.selectedIndex;
    }
    setupEvents() {
      const _this = this;
      if (this.prev_button) {
        let prev = this.prev_button.cloneNode(true);
        this.prev_button.parentNode.append(prev);
        this.prev_button.remove();
        prev.addEventListener('click', (event) => {
          this.flkty.previous();
        });
        prev.addEventListener('keyup', (event) => {
          this.flkty.previous();
          event.preventDefault();
        });
      }
      if (this.next_button) {
        let next = this.next_button.cloneNode(true);
        this.next_button.parentNode.append(next);
        this.next_button.remove();
        next.addEventListener('click', (event) => {
          this.flkty.next();
        });
        next.addEventListener('keyup', (event) => {
          this.flkty.next();
          event.preventDefault();
        });
      }
      this.video_containers.forEach((container) => {
        container.querySelector('button').addEventListener('click', function () {
          container.setAttribute('hidden', '');
        });
      });
      this.flkty.on('settle', function (index) {
        _this.selectedIndex = index;
      });
      this.flkty.on('change', (index) => {

        let previous_slide = this.flkty.cells[_this.selectedIndex].element,
          previous_media = previous_slide.querySelector('.product-single__media');

        if (this.thumbnail_container) {
          let active_thumbs = Array.from(this.thumbnails).filter(element => element.classList.contains('is-active')),
            active_thumb = active_thumbs[index] ? active_thumbs[index] : active_thumbs[0];

          this.thumbnails.forEach((item, i) => {
            item.classList.remove('is-initial-selected');
          });
          active_thumb.classList.add('is-initial-selected');

          requestAnimationFrame(() => {
            if (active_thumb.offsetParent === null) {
              return;
            }
            const windowHalfHeight = active_thumb.offsetParent.clientHeight / 2,
              windowHalfWidth = active_thumb.offsetParent.clientWidth / 2;
            active_thumb.parentElement.scrollTo({
              left: active_thumb.offsetLeft - windowHalfWidth + active_thumb.clientWidth / 2,
              top: active_thumb.offsetTop - windowHalfHeight + active_thumb.clientHeight / 2,
              behavior: 'smooth'
            });
          });
        }

        // Stop previous video
        if (previous_media.classList.contains('product-single__media-external-video')) {
          if (previous_media.dataset.provider === 'youtube') {
            previous_media.querySelector('iframe').contentWindow.postMessage(JSON.stringify({
              event: "command",
              func: "pauseVideo",
              args: ""
            }), "*");
          } else if (previous_media.dataset.provider === 'vimeo') {
            previous_media.querySelector('iframe').contentWindow.postMessage(JSON.stringify({
              method: "pause"
            }), "*");
          }
          previous_media.querySelector('.product-single__media-external-video--play').removeAttribute('hidden');
        } else if (previous_media.classList.contains('product-single__media-native-video')) {
          previous_media.querySelector('video').pause();
        }

      });

      if (this.thumbnail_container) {
        setTimeout(() => {
          let active_thumbs = Array.from(this.thumbnails).filter(element => element.clientWidth > 0);
          active_thumbs.forEach((thumbnail, index) => {
            thumbnail.addEventListener('click', () => {
              this.thumbnailClick(thumbnail, index);
            });
          });
        });
      }

    }
    thumbnailClick(thumbnail, index) {
      [].forEach.call(this.thumbnails, function (el) {
        el.classList.remove('is-initial-selected');
      });
      thumbnail.classList.add('is-initial-selected');
      this.flkty.select(index);
    }
    setDraggable(draggable) {
      this.flkty.options.draggable = draggable;
      this.flkty.updateDraggable();
    }
    selectCell(mediaId) {
      if (this.flkty) {
        this.flkty.selectCell(mediaId);
        return;
      }
      let slide = this.querySelector(mediaId);
      if (!slide) return;
      this.scrollTo({
        left: this.scrollLeft + slide.getBoundingClientRect().left - this.getBoundingClientRect().left - parseFloat(getComputedStyle(this).paddingLeft),
        behavior: 'instant'
      });
    }
    setupProductGallery() {
      if (!this.querySelectorAll('.product-single__media-zoom').length) {
        return;
      }
      this.setEventListeners();
    }
    buildItems() {
      this.activeImages = Array.from(this.querySelectorAll('.product-images__slide.is-active .product-single__media-image')).filter(item => item.clientWidth > 0);

      return this.activeImages.map((item, index) => {
        let activelink = item.querySelector('.product-single__media-zoom');

        activelink.dataset.index = index;
        return {
          src: activelink.getAttribute('href'),
          msrc: activelink.dataset.msrc,
          w: activelink.dataset.w,
          h: activelink.dataset.h
        };
      });
    }
    setEventListeners() {
      this.links = this.querySelectorAll('.product-single__media-zoom');
      this.pswpElement = document.querySelectorAll('.pswp')[0];
      this.pswpOptions = {
        maxSpreadZoom: 2,
        loop: false,
        allowPanToNext: false,
        closeOnScroll: false,
        showHideOpacity: false,
        arrowKeys: true,
        history: false,
        captionEl: false,
        fullscreenEl: false,
        zoomEl: false,
        shareEl: false,
        counterEl: true,
        arrowEl: true,
        preloaderEl: true,
        getThumbBoundsFn: () => {
          const thumbnail = this.querySelector('.product-images__slide.is-selected') || this.zoomSlide,
            pageYScroll = window.pageYOffset || document.documentElement.scrollTop,
            rect = thumbnail.getBoundingClientRect();
          return {
            x: rect.left,
            y: rect.top + pageYScroll,
            w: rect.width
          };
        }
      };


      this.links.forEach((link => {
        if (link.dataset.zoomBound) return;
        link.dataset.zoomBound = 'true';
        link.addEventListener('click', (e) => this.zoomClick(e, link));
      }));
    }
    zoomClick(e, link) {
      this.zoomSlide = link.closest('.product-images__slide');
      this.items = this.buildItems();
      this.pswpOptions.index = parseInt(link.dataset.index, 10);
      if (typeof PhotoSwipe !== 'undefined') {
        let pswp = new PhotoSwipe(this.pswpElement, PhotoSwipeUI_Default, this.items, this.pswpOptions);
        pswp.listen('firstUpdate', function () {
          pswp.listen('parseVerticalMargin', function (item) {
            item.vGap = {
              top: 50,
              bottom: 50
            };
          });
        });
        pswp.init();
      }
      e.preventDefault();
    }
  }
  customElements.define('product-slider-thumbnails', ProductSliderThumbnails);
}
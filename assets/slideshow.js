/**
 *  @class
 *  @function SlideShow
 */
if (!customElements.get('slide-show')) {
  class SlideShow extends HTMLElement {
    constructor() {
      super();
      const slideshow = this,
        dataset = slideshow.dataset;

      let dots = dataset.dots === 'true',
        slideshow_slides = Array.from(slideshow.querySelectorAll('.carousel__slide')),
        autoplay = dataset.autoplay == 'false' ? false : parseInt(dataset.autoplay, 10),
        align = dataset.align == 'center' ? 'center' : 'left',
        fade = dataset.fade == 'true' ? true : false,
        custom_dots = slideshow.querySelector('.flickity-page-dots'),
        animations = [],
        rightToLeft = document.dir === 'rtl',
        animations_enabled = document.body.classList.contains('animations-true') && typeof gsap !== 'undefined';

      if (slideshow_slides.length < 1) return;

      const args = {
        wrapAround: true,
        cellAlign: align,
        pageDots: dots,
        contain: true,
        fade: fade,
        autoPlay: autoplay,
        rightToLeft: rightToLeft,
        prevNextButtons: false,
        cellSelector: '.carousel__slide',
        on: {}
      };

      if (slideshow_slides.length < 1) {
        return;
      }
      if (slideshow.classList.contains('image-with-text-slideshow--image')) {
        const image_slideshow_slides = slideshow.querySelectorAll('.image-with-text-slideshow--image-media');
        args.draggable = false;

        if (image_slideshow_slides.length) {
          if (image_slideshow_slides[0].classList.contains('desktop-height-auto')) {
            args.adaptiveHeight = true;
          }
        }
      }
      if (slideshow.classList.contains('image-with-text-slideshow--content')) {
        args.draggable = false;
        args.asNavFor = slideshow.parentNode.querySelector('.image-with-text-slideshow--image');
      }
      if (slideshow.classList.contains('image-with-text-slideshow--content') ||
        slideshow.classList.contains('testimonials__carousel')) {
        args.adaptiveHeight = true;
      }
      if (slideshow.classList.contains('custom-dots')) {
        if (animations_enabled && slideshow.classList.contains('main-slideshow')) {
          this.prepareAnimations(slideshow, animations);
        }
        args.pauseAutoPlayOnHover = false;

        args.on = {
          staticClick: function () {
            this.unpausePlayer();
          },
          ready: function () {
            let flkty = this;
            // Animations.
            if (animations_enabled && slideshow.classList.contains('main-slideshow')) {
              slideshow.animateSlides(0, animations);
              gsap.set(slideshow.querySelectorAll('.inline-badge,.subheading,.split-text,.button'), { visibility: 'visible' });
            }

            // Custom Dots.
            if (custom_dots) {
              let dots = custom_dots.querySelectorAll('li');
              dots.forEach((dot, i) => {
                dot.addEventListener('click', () => flkty.select(i));
              });
              dots[this.selectedIndex].classList.add('is-selected');
            }
            document.fonts.ready.then(function () {
              flkty.resize();
            });

            // Video Support.
            const video_container = flkty.cells[0].element.querySelector('.slideshow__slide-video-bg');
            if (video_container) {
              const iframe = video_container.querySelector('iframe');
              const video = video_container.querySelector('video');
              if (iframe) {
                iframe.onload = () => slideshow.videoPlay(video_container);
              } else if (video) {
                video.onloadstart = () => slideshow.videoPlay(video_container);
              }
            }
          },
          change: function (index) {
            flkty.cells[0].element.classList.remove('is-initial-selected');
            let previousIndex = fizzyUIUtils.modulo(this.selectedIndex - 1, this.slides.length);

            // Animations.
            if (animations_enabled && slideshow.classList.contains('main-slideshow')) {
              setTimeout(() => {
                slideshow.animateReverse(previousIndex, animations);
              }, 700);
              slideshow.animateSlides(index, animations);
            }

            // Color changes.
            const selectedElement = this.selectedElement;
            const color_text = getComputedStyle(selectedElement).getPropertyValue('--color-body');
            const color_text_rgb = getComputedStyle(selectedElement).getPropertyValue('--color-body-rgb');
            slideshow.style.setProperty('--color-body', color_text);
            slideshow.style.setProperty('--color-body-rgb', color_text_rgb);

            // Custom Dots.
            if (custom_dots) {
              let dots = custom_dots.querySelectorAll('li');
              dots.forEach((dot, i) => {
                dot.classList.remove('is-selected');
              });
              dots[this.selectedIndex].classList.add('is-selected');
            }

            // AutoPlay
            if (autoplay) {
              this.stopPlayer();
              this.playPlayer();
            }

            // Video Support.
            // previous slide
            let video_container_prev = flkty.cells[previousIndex].element.querySelector('.slideshow__slide-video-bg');
            if (video_container_prev) {
              slideshow.videoPause(video_container_prev);
            }
            // current slide
            let video_container = flkty.cells[index].element.querySelector('.slideshow__slide-video-bg');
            if (video_container) {
              if (video_container.querySelector('iframe')) {
                if (video_container.querySelector('iframe').classList.contains('lazyload')) {
                  video_container.querySelector('iframe').addEventListener('lazybeforeunveil', slideshow.videoPlay(video_container));
                  lazySizes.loader.checkElems();
                } else {
                  slideshow.videoPlay(video_container);
                }
              } else if (video_container.querySelector('video')) {
                slideshow.videoPlay(video_container);
              }
            }

          }
        };
      }
      if (slideshow.classList.contains('main-slideshow')) {
        if (slideshow.classList.contains('desktop-height-image') || slideshow.classList.contains('mobile-height-image')) {
          args.adaptiveHeight = true;
        }
      }
      const flkty = new Flickity(slideshow, args);

      dataset.initiated = true;



      if (Shopify.designMode) {
        slideshow.addEventListener('shopify:block:select', (event) => {
          const index = slideshowSlides.indexOf(event.target);
          flkty.select(index);
        });
      }

    }
    videoPause(video_container) {
      setTimeout(() => {
        if (video_container.dataset.provider === 'hosted') {
          video_container.querySelector('video').pause();
        } else {
          const iframe = video_container.querySelector('iframe');
          const message = iframe.dataset.provider === 'youtube' ? { event: "command", func: "pauseVideo", args: "" } : { method: "pause" };

          iframe.contentWindow.postMessage(JSON.stringify(message), "*");
        }
      }, 10);
    }
    videoPlay(video_container) {
      setTimeout(() => {
        if (video_container.dataset.provider === 'hosted') {
          video_container.querySelector('video').play();
        } else {
          const iframe = video_container.querySelector('iframe');
          const message = iframe.dataset.provider === 'youtube' ? { event: "command", func: "playVideo", args: "" } : { method: "play" };

          iframe.contentWindow.postMessage(JSON.stringify(message), "*");
        }
      }, 10);
    }
    prepareAnimations(slideshow, animations) {
      if (!slideshow.dataset.animationsReady) {
        new SplitText(slideshow.querySelectorAll('.split-text'), {
          type: 'lines',
          linesClass: 'line-child'
        });
        new SplitText(slideshow.querySelectorAll('.split-text'), {
          type: 'lines',
          linesClass: 'line-parent'
        });
        slideshow.querySelectorAll('.slideshow__slide').forEach((item, i) => {
          let tl = gsap.timeline({
            paused: true
          });

          animations[i] = tl;

          if (slideshow.dataset.transition == 'swipe') {
            tl
              .fromTo(item, {
                clipPath: 'polygon(0 0, 0 0, 0 100%, 0 100%)'
              }, {
                duration: 0.7,
                clipPath: 'polygon(0 0, 100% 0, 100% 100%, 0 100%)'
              }, "start");
          }
          tl
            .to(item.querySelector('.slideshow__slide-bg'), {
              duration: 1,
              scale: 1
            }, "start");
          tl
            .fromTo(item.querySelector('.inline-badge'), {
              opacity: 0
            }, {
              duration: 0.25,
              opacity: 1
            }, '>-=0.5');

          tl
            .fromTo(item.querySelector('.subheading'), {
              opacity: 0
            }, {
              duration: 0.25,
              opacity: 1
            }, '>-=0.3');
          tl
            .from(item.querySelectorAll('.slideshow__slide-content--heading .line-child'), {
              duration: 0.75,
              yPercent: 120,
              stagger: 0.1,
              rotation: '2deg'
            }, '>-=0.3');

          tl
            .from(item.querySelectorAll('p:not(.subheading) .line-child'), {
              duration: 0.5,
              yPercent: 120,
              stagger: 0.02,
              rotation: '2deg'
            }, '>-=0.3');
          tl
            .fromTo(item.querySelectorAll('.button'), {
              yPercent: 120,
              rotation: '2deg'
            }, {
              duration: 0.5,
              yPercent: 0,
              rotation: 0,
              stagger: 0.1,
            }, '>-=0.3');
          item.dataset.timeline = tl;
        });
        slideshow.dataset.animationsReady = true;
      }
    }
    animateSlides(i, animations) {
      animations[i].timeScale(1).restart();
    }
    animateReverse(i, animations) {
      animations[i].timeScale(4).reverse();
    }
  }
  customElements.define('slide-show', SlideShow);
}
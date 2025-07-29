document.addEventListener('DOMContentLoaded', () => {
  const searchInput = document.querySelector('.header__content');
  const eventsContainer = document.getElementById('events-container');
  const modalTemplate = document.getElementById('event-modal-template');
  const countrySelect = document.querySelector('.header__select');
  const paginationContainer = document.getElementById('pagination-container');

  let scrollPosition = 0;
  let allEvents = [];
  let currentEvents = [];
  let currentPage = 1;
  const eventsPerPage = 20;
  let totalPages = 29;
  let isFetching = false;

  const truncateDescription = (text, maxLength = 150) => {
    if (!text) return 'No description available.';
    return text.length > maxLength ? text.slice(0, maxLength) + '...' : text;
  };

  const selectBestImage = (images, targetWidth) => {
    const fallback = `https://images.unsplash.com/photo-1506748686214-e9df14d4d9d0?q=80&w=${targetWidth}`;
    if (!images || !images.length) {
      console.warn(`No images provided for target width ${targetWidth}, using fallback`);
      return fallback;
    }
    const validImages = images.filter(img => img.url && img.url.match(/^https?:\/\//));
    if (!validImages.length) {
      console.warn(`No valid images found for target width ${targetWidth}, using fallback`);
      return fallback;
    }
    console.log(`Available images for target width ${targetWidth}:`, JSON.stringify(validImages, null, 2));
    const bestImage = validImages.reduce((best, img) => {
      if (!img.width) return best;
      const bestDiff = Math.abs(best.width - targetWidth);
      const currDiff = Math.abs(img.width - targetWidth);
      return currDiff < bestDiff ? img : best;
    }, validImages[0]);
    const selectedUrl = bestImage.url || fallback;
    console.log(`Selected image for ${targetWidth}px: ${selectedUrl} (width: ${bestImage.width || 'unknown'})`);
    return selectedUrl;
  };

  const populateCountrySelect = () => {
    console.log('Populating country select with events:', allEvents.length);
    const uniqueCountries = [...new Set(allEvents.map(ev => ev.countryCode).filter(c => c && c !== 'Unknown'))];
    console.log('Unique countries with events:', uniqueCountries);
    
    countrySelect.innerHTML = '<option value="" selected>All Countries</option>';
    
    uniqueCountries.forEach(code => {
      const eventCount = allEvents.filter(ev => ev.countryCode === code).length;
      if (eventCount > 0) {
        const name = {
          'UA': 'Ukraine', 'US': 'United States', 'GB': 'United Kingdom', 'FR': 'France',
          'DE': 'Germany', 'IT': 'Italy', 'NL': 'Netherlands', 'CA': 'Canada',
          'AU': 'Australia', 'IE': 'Ireland', 'PT': 'Portugal', 'PL': 'Poland',
          'NZ': 'New Zealand', 'ES': 'Spain', 'AT': 'Austria', 'SG': 'Singapore'
        }[code] || code;
        const option = document.createElement('option');
        option.value = code;
        option.textContent = name;
        countrySelect.appendChild(option);
        console.log(`Added country: ${name} (${code}), Events: ${eventCount}`);
      } else {
        console.log(`Skipped country ${code}: no events`);
      }
    });
    console.log('Country select populated with', uniqueCountries.length, 'countries');
  };

  const filterAndRenderEvents = () => {
    const countryCode = countrySelect.value || '';
    const searchTerm = searchInput.value.trim().toLowerCase();

    console.log('Filtering events. Country:', countryCode || 'All', 'Search:', searchTerm);
    let filtered = allEvents;
    if (countryCode) {
      filtered = filtered.filter(e => {
        const eventCountry = e.countryCode || 'Unknown';
        const match = eventCountry === countryCode;
        console.log(`Event: ${e.name}, Country: ${eventCountry}, Match: ${match}`);
        return match;
      });
    }
    if (searchTerm) {
      filtered = filtered.filter(e => (e.name || '').toLowerCase().includes(searchTerm));
    }
    currentEvents = filtered;
    totalPages = Math.max(1, Math.ceil(currentEvents.length / eventsPerPage));
    currentPage = 1;

    console.log('Filtered events:', currentEvents.length, 'Total pages:', totalPages);
    renderEventsForPage();
    renderPagination();
  };

  const renderEventsForPage = () => {
    eventsContainer.innerHTML = '';
    console.log(`Rendering page ${currentPage}, events: ${currentEvents.length}`);

    const startIndex = (currentPage - 1) * eventsPerPage;
    const visible = currentEvents.slice(startIndex, startIndex + eventsPerPage);

    if (visible.length === 0) {
      console.warn('No events to render for current page');
      eventsContainer.innerHTML = '<p class="events__no-results">No events available.</p>';
      return;
    }

    visible.forEach(event => {
      const container = document.createElement('div');
      container.className = 'events__container';

      container.innerHTML = `
        <a href="#" class="events__link">
          <img 
            class="events__boom-box" 
            src="${selectBestImage(event.images, 196)}" 
            alt="${event.name || 'Event'}" 
            width="196" 
            height="260" 
            onerror="this.src='https://images.unsplash.com/photo-1506748686214-e9df14d4d9d0?q=80&w=196'; console.error('Failed to load image for event: ${event.name || 'Unknown'}')"
          >
        </a>
        <h4 class="events__boom-box-title">${event.name || 'Untitled Event'}</h4>
        <p class="events__boom-box-data">${event.dates?.start?.localDate || 'TBD'}</p>
        <p class="events__boom-box-where"><img src="./images/vectorm.svg">${event._embedded?.venues?.[0]?.name || 'TBD'}</p>
      `;
      eventsContainer.appendChild(container);
    });

    console.log('Events rendered:', visible.length);
    bindEventLinksToModals();
    renderPagination();
  };

  const renderPagination = () => {
    paginationContainer.innerHTML = '';
    console.log('Rendering pagination, total pages:', totalPages);

    const createBtn = (num) => {
      const btn = document.createElement('button');
      btn.className = 'pagination__button';
      btn.textContent = num;
      if (num === currentPage) btn.classList.add('pagination__button--active');
      btn.addEventListener('click', () => {
        if (num !== currentPage) {
          currentPage = num;
          renderEventsForPage();
          renderPagination();
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      });
      return btn;
    };

    const addDots = () => {
      const dots = document.createElement('span');
      dots.className = 'pagination__dots';
      dots.textContent = '...';
      paginationContainer.appendChild(dots);
    };

    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i++) paginationContainer.appendChild(createBtn(i));
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 4; i++) paginationContainer.appendChild(createBtn(i));
        addDots();
        paginationContainer.appendChild(createBtn(totalPages));
      } else if (currentPage >= totalPages - 2) {
        paginationContainer.appendChild(createBtn(1));
        addDots();
        for (let i = totalPages - 3; i <= totalPages; i++) paginationContainer.appendChild(createBtn(i));
      } else {
        paginationContainer.appendChild(createBtn(1));
        addDots();
        for (let i = currentPage - 1; i <= currentPage + 1; i++) paginationContainer.appendChild(createBtn(i));
        addDots();
        paginationContainer.appendChild(createBtn(totalPages));
      }
    }
    console.log('Pagination rendered');
  };

  const updateModal = (event, modal) => {
    const modalLogo = modal.querySelector('.modal__logo img');
    const modalImage = modal.querySelector('.modal__artist-image');
    const modalInfo = modal.querySelector('.modal__info p');
    const modalInfoTitle = modal.querySelector('.modal__info h2');
    const modalWhen = modal.querySelectorAll('.modal__when p');
    const modalWhere = modal.querySelectorAll('.modal__where p');
    const modalWho = modal.querySelector('.modal__who p');
    const modalPrices = modal.querySelectorAll('.modal__price-option');

    const imgUrl = selectBestImage(event.images, 360);
    modalLogo.src = imgUrl;
    modalLogo.alt = event.name || 'Event';
    modalLogo.onerror = () => {
      console.error(`Failed to load modal logo for event: ${event.name || 'Unknown'}`);
      modalLogo.src = 'https://images.unsplash.com/photo-1506748686214-e9df14d4d9d0?q=80&w=100';
    };
    modalImage.src = imgUrl;
    modalImage.alt = event.name || 'Event';
    modalImage.onerror = () => {
      console.error(`Failed to load modal artist image for event: ${event.name || 'Unknown'}`);
      modalImage.src = 'https://images.unsplash.com/photo-1506748686214-e9df14d4d9d0?q=80&w=360';
    };

    modalInfoTitle.textContent = `About "${event.name || 'Untitled Event'}"`;
    modalInfo.textContent = truncateDescription(event.description, 300);

    modalWhen[0].textContent = event.dates?.start?.localDate || 'TBD';
    modalWhen[1].textContent = event.dates?.start?.localTime ? `${event.dates.start.localTime} (${event._embedded?.venues?.[0]?.city?.name || 'TBD'})` : '';
    modalWhere[0].textContent = event._embedded?.venues?.[0]?.city?.name || 'TBD';
    modalWhere[1].textContent = event._embedded?.venues?.[0]?.name || 'TBD';
    modalWho.textContent = event._embedded?.attractions?.[0]?.name || 'Various Artists';
    modalPrices[0].querySelector('p').textContent = `Standard ${event.priceRanges?.[0]?.min || 'TBD'}–${event.priceRanges?.[0]?.max || 'TBD'} UAH`;
    modalPrices[1].querySelector('p').textContent = `VIP ${event.priceRanges?.[1]?.min || 'TBD'}–${event.priceRanges?.[1]?.max || 'TBD'} UAH`;
  };

  const bindEventLinksToModals = () => {
    const eventLinks = document.querySelectorAll('.events__link');
    eventLinks.forEach((link, index) => {
      link.addEventListener('click', e => {
        e.preventDefault();
        scrollPosition = window.scrollY;
        const modalId = `event-${index}-modal`;
        let modal = document.getElementById(modalId);
        const eventIndex = allEvents.findIndex(
          e => e.name === currentEvents[(currentPage - 1) * eventsPerPage + index]?.name
        );
        if (!modal && eventIndex !== -1) {
          modal = modalTemplate.cloneNode(true);
          modal.id = modalId;
          modal.style.display = 'block';
          document.body.appendChild(modal);
          updateModal(allEvents[eventIndex], modal);

          const closeButton = modal.querySelector('.modal__close');
          if (closeButton) {
            closeButton.addEventListener('click', () => {
              console.log('Close button clicked for modal:', modalId);
              modal.style.display = 'none';
              document.body.classList.remove('body--modal-open--');
              document.body.style.top = '';
              window.scrollTo(0, scrollPosition);
            });
          } else {
            console.error('Close button not found in modal:', modalId);
          }
        } else if (modal && eventIndex !== -1) {
          modal.style.display = 'block';
          updateModal(allEvents[eventIndex], modal);
        } else {
          console.error('Event not found for index:', eventIndex);
        }
        document.body.classList.add('body--modal-open--');
        document.body.style.top = `-${scrollPosition}px`;
      });
    });
  };

  const getTestEvents = () => {
    const base = [
      { 
        name: 'Inception', 
        images: [
          { url: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?q=80&w=360', width: 360 }, 
          { url: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?q=80&w=196', width: 196 }
        ], 
        dates: { start: { localDate: '2025-07-22', localTime: '19:00' } }, 
        _embedded: { venues: [{ name: 'Cineplex Kyiv', city: { name: 'Kyiv' }, country: { countryCode: 'UA' } }], attractions: [{ name: 'Christopher Nolan' }] }, 
        description: 'A mind-bending thriller about dreams within dreams.', 
        priceRanges: [{ type: 'standard', min: 200, max: 400 }, { type: 'VIP', min: 2000, max: 4000 }],
        countryCode: 'UA'
      },
      { 
        name: 'The Dark Knight', 
        images: [
          { url: 'https://images.unsplash.com/photo-1531251445707-25804c5012b6?q=80&w=360', width: 360 }, 
          { url: 'https://images.unsplash.com/photo-1531251445707-25804c5012b6?q=80&w=196', width: 196 }
        ], 
        dates: { start: { localDate: '2025-07-23', localTime: '20:00' } }, 
        _embedded: { venues: [{ name: 'AMC Lincoln Square', city: { name: 'New York' }, country: { countryCode: 'US' } }], attractions: [{ name: 'Christopher Nolan' }] }, 
        description: 'A dark superhero epic featuring Batman.', 
        priceRanges: [{ type: 'standard', min: 250, max: 450 }, { type: 'VIP', min: 2500, max: 4500 }],
        countryCode: 'US'
      },
      { 
        name: 'Parasite', 
        images: [
          { url: 'https://images.unsplash.com/photo-1580130775562-0a6b47c9a6a1?q=80&w=360', width: 360 }, 
          { url: 'https://images.unsplash.com/photo-1580130775562-0a6b47c9a6a1?q=80&w=196', width: 196 }
        ], 
        dates: { start: { localDate: '2025-07-24', localTime: '18:00' } }, 
        _embedded: { venues: [{ name: 'Odeon Leicester Square', city: { name: 'London' }, country: { countryCode: 'GB' } }], attractions: [{ name: 'Bong Joon-ho' }] }, 
        description: 'A gripping social satire about class disparity.', 
        priceRanges: [{ type: 'standard', min: 300, max: 500 }, { type: 'VIP', min: 3000, max: 5000 }],
        countryCode: 'GB'
      },
      { 
        name: 'Interstellar', 
        images: [
          { url: 'https://images.unsplash.com/photo-1605148348423-5fabea5f2c76?q=80&w=360', width: 360 }, 
          { url: 'https://images.unsplash.com/photo-1605148348423-5fabea5f2c76?q=80&w=196', width: 196 }
        ], 
        dates: { start: { localDate: '2025-07-25', localTime: '17:00' } }, 
        _embedded: { venues: [{ name: 'Cineworld Berlin', city: { name: 'Berlin' }, country: { countryCode: 'DE' } }], attractions: [{ name: 'Christopher Nolan' }] }, 
        description: 'A sci-fi epic about space exploration.', 
        priceRanges: [{ type: 'standard', min: 280, max: 480 }, { type: 'VIP', min: 2800, max: 4800 }],
        countryCode: 'DE'
      },
      { 
        name: 'Pulp Fiction', 
        images: [
          { url: 'https://images.unsplash.com/photo-1523207914-0da2c0a4b5c1?q=80&w=360', width: 360 }, 
          { url: 'https://images.unsplash.com/photo-1523207914-0da2c0a4b5c1?q=80&w=196', width: 196 }
        ], 
        dates: { start: { localDate: '2025-07-26', localTime: '21:00' } }, 
        _embedded: { venues: [{ name: 'Cinema Paris', city: { name: 'Paris' }, country: { countryCode: 'FR' } }], attractions: [{ name: 'Quentin Tarantino' }] }, 
        description: 'A nonlinear crime drama.', 
        priceRanges: [{ type: 'standard', min: 220, max: 420 }, { type: 'VIP', min: 2200, max: 4200 }],
        countryCode: 'FR'
      },
      { 
        name: 'The Shawshank Redemption', 
        images: [
          { url: 'https://images.unsplash.com/photo-1593642634315-48f5414c3ad9?q=80&w=360', width: 360 }, 
          { url: 'https://images.unsplash.com/photo-1593642634315-48f5414c3ad9?q=80&w=196', width: 196 }
        ], 
        dates: { start: { localDate: '2025-07-27', localTime: '19:30' } }, 
        _embedded: { venues: [{ name: 'Regal LA', city: { name: 'Los Angeles' }, country: { countryCode: 'US' } }], attractions: [{ name: 'Frank Darabont' }] }, 
        description: 'A story of hope and friendship in prison.', 
        priceRanges: [{ type: 'standard', min: 230, max: 430 }, { type: 'VIP', min: 2300, max: 4300 }],
        countryCode: 'US'
      },
      { 
        name: 'Fight Club', 
        images: [
          { url: 'https://images.unsplash.com/photo-1517604931442-7e0c8ed2962c?q=80&w=360', width: 360 }, 
          { url: 'https://images.unsplash.com/photo-1517604931442-7e0c8ed2962c?q=80&w=196', width: 196 }
        ], 
        dates: { start: { localDate: '2025-07-28', localTime: '20:30' } }, 
        _embedded: { venues: [{ name: 'Vue London', city: { name: 'London' }, country: { countryCode: 'GB' } }], attractions: [{ name: 'David Fincher' }] }, 
        description: 'An anarchic exploration of identity.', 
        priceRanges: [{ type: 'standard', min: 240, max: 440 }, { type: 'VIP', min: 2400, max: 4400 }],
        countryCode: 'GB'
      },
      { 
        name: 'The Godfather', 
        images: [
          { url: 'https://images.unsplash.com/photo-1586278575485-2c8f7d996b7b?q=80&w=360', width: 360 }, 
          { url: 'https://images.unsplash.com/photo-1586278575485-2c8f7d996b7b?q=80&w=196', width: 196 }
        ], 
        dates: { start: { localDate: '2025-07-29', localTime: '18:30' } }, 
        _embedded: { venues: [{ name: 'Cinema Roma', city: { name: 'Rome' }, country: { countryCode: 'IT' } }], attractions: [{ name: 'Francis Ford Coppola' }] }, 
        description: 'A mafia family saga.', 
        priceRanges: [{ type: 'standard', min: 260, max: 460 }, { type: 'VIP', min: 2600, max: 4600 }],
        countryCode: 'IT'
      },
      { 
        name: 'Forrest Gump', 
        images: [
          { url: 'https://images.unsplash.com/photo-1541577145497-ae696f9b7328?q=80&w=360', width: 360 }, 
          { url: 'https://images.unsplash.com/photo-1541577145497-ae696f9b7328?q=80&w=196', width: 196 }
        ], 
        dates: { start: { localDate: '2025-07-30', localTime: '19:00' } }, 
        _embedded: { venues: [{ name: 'Pathé Amsterdam', city: { name: 'Amsterdam' }, country: { countryCode: 'NL' } }], attractions: [{ name: 'Robert Zemeckis' }] }, 
        description: 'A journey through American history.', 
        priceRanges: [{ type: 'standard', min: 210, max: 410 }, { type: 'VIP', min: 2100, max: 4100 }],
        countryCode: 'NL'
      },
      { 
        name: 'The Matrix', 
        images: [
          { url: 'https://images.unsplash.com/photo-1518709268805-4e9042af592c?q=80&w=360', width: 360 }, 
          { url: 'https://images.unsplash.com/photo-1518709268805-4e9042af592c?q=80&w=196', width: 196 }
        ], 
        dates: { start: { localDate: '2025-07-31', localTime: '20:00' } }, 
        _embedded: { venues: [{ name: 'Cineplex Toronto', city: { name: 'Toronto' }, country: { countryCode: 'CA' } }], attractions: [{ name: 'Wachowskis' }] }, 
        description: 'A sci-fi action film about reality.', 
        priceRanges: [{ type: 'standard', min: 270, max: 470 }, { type: 'VIP', min: 2700, max: 4700 }],
        countryCode: 'CA'
      },
      { 
        name: 'Gladiator', 
        images: [
          { url: 'https://images.unsplash.com/photo-1555861496-0666c8981751?q=80&w=360', width: 360 }, 
          { url: 'https://images.unsplash.com/photo-1555861496-0666c8981751?q=80&w=196', width: 196 }
        ], 
        dates: { start: { localDate: '2025-08-01', localTime: '18:00' } }, 
        _embedded: { venues: [{ name: 'Cinemax Sydney', city: { name: 'Sydney' }, country: { countryCode: 'AU' } }], attractions: [{ name: 'Ridley Scott' }] }, 
        description: 'A tale of revenge in ancient Rome.', 
        priceRanges: [{ type: 'standard', min: 250, max: 450 }, { type: 'VIP', min: 2500, max: 4500 }],
        countryCode: 'AU'
      },
      { 
        name: 'Titanic', 
        images: [
          { url: 'https://images.unsplash.com/photo-1516627145497-ae696f9b7328?q=80&w=360', width: 360 }, 
          { url: 'https://images.unsplash.com/photo-1516627145497-ae696f9b7328?q=80&w=196', width: 196 }
        ], 
        dates: { start: { localDate: '2025-08-02', localTime: '19:00' } }, 
        _embedded: { venues: [{ name: 'Odeon Dublin', city: { name: 'Dublin' }, country: { countryCode: 'IE' } }], attractions: [{ name: 'James Cameron' }] }, 
        description: 'A romantic epic disaster film.', 
        priceRanges: [{ type: 'standard', min: 240, max: 440 }, { type: 'VIP', min: 2400, max: 4400 }],
        countryCode: 'IE'
      },
      { 
        name: 'Blade Runner', 
        images: [
          { url: 'https://images.unsplash.com/photo-1485846234645-a62644f84728?q=80&w=360', width: 360 }, 
          { url: 'https://images.unsplash.com/photo-1485846234645-a62644f84728?q=80&w=196', width: 196 }
        ], 
        dates: { start: { localDate: '2025-08-03', localTime: '20:00' } }, 
        _embedded: { venues: [{ name: 'Kino Lisboa', city: { name: 'Lisbon' }, country: { countryCode: 'PT' } }], attractions: [{ name: 'Ridley Scott' }] }, 
        description: 'A dystopian sci-fi noir.', 
        priceRanges: [{ type: 'standard', min: 230, max: 430 }, { type: 'VIP', min: 2300, max: 4300 }],
        countryCode: 'PT'
      },
      { 
        name: 'Schindler’s List', 
        images: [
          { url: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?q=80&w=360', width: 360 }, 
          { url: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?q=80&w=196', width: 196 }
        ], 
        dates: { start: { localDate: '2025-08-04', localTime: '19:30' } }, 
        _embedded: { venues: [{ name: 'Cineplex Warsaw', city: { name: 'Warsaw' }, country: { countryCode: 'PL' } }], attractions: [{ name: 'Steven Spielberg' }] }, 
        description: 'A historical drama about the Holocaust.', 
        priceRanges: [{ type: 'standard', min: 260, max: 460 }, { type: 'VIP', min: 2600, max: 4600 }],
        countryCode: 'PL'
      },
      { 
        name: 'The Lord of the Rings: The Fellowship of the Ring', 
        images: [
          { url: 'https://images.unsplash.com/photo-1533613220915-b3e86a4437e0?q=80&w=360', width: 360 }, 
          { url: 'https://images.unsplash.com/photo-1533613220915-b3e86a4437e0?q=80&w=196', width: 196 }
        ], 
        dates: { start: { localDate: '2025-08-05', localTime: '18:30' } }, 
        _embedded: { venues: [{ name: 'Event Cinemas Auckland', city: { name: 'Auckland' }, country: { countryCode: 'NZ' } }], attractions: [{ name: 'Peter Jackson' }] }, 
        description: 'An epic fantasy adventure.', 
        priceRanges: [{ type: 'standard', min: 270, max: 470 }, { type: 'VIP', min: 2700, max: 4700 }],
        countryCode: 'NZ'
      },
      { 
        name: 'Star Wars: A New Hope', 
        images: [
          { url: 'https://images.unsplash.com/photo-1528720208104-3d9bd03cc9d4?q=80&w=360', width: 360 }, 
          { url: 'https://images.unsplash.com/photo-1528720208104-3d9bd03cc9d4?q=80&w=196', width: 196 }
        ], 
        dates: { start: { localDate: '2025-08-06', localTime: '19:00' } }, 
        _embedded: { venues: [{ name: 'Cineplex Montreal', city: { name: 'Montreal' }, country: { countryCode: 'CA' } }], attractions: [{ name: 'George Lucas' }] }, 
        description: 'A space opera classic.', 
        priceRanges: [{ type: 'standard', min: 250, max: 450 }, { type: 'VIP', min: 2500, max: 4500 }],
        countryCode: 'CA'
      },
      { 
        name: 'Jurassic Park', 
        images: [
          { url: 'https://images.unsplash.com/photo-1542204626-3c4b5f4d5a4e?q=80&w=360', width: 360 }, 
          { url: 'https://images.unsplash.com/photo-1542204626-3c4b5f4d5a4e?q=80&w=196', width: 196 }
        ], 
        dates: { start: { localDate: '2025-08-07', localTime: '20:00' } }, 
        _embedded: { venues: [{ name: 'Cineworld Glasgow', city: { name: 'Glasgow' }, country: { countryCode: 'GB' } }], attractions: [{ name: 'Steven Spielberg' }] }, 
        description: 'A sci-fi adventure with dinosaurs.', 
        priceRanges: [{ type: 'standard', min: 240, max: 440 }, { type: 'VIP', min: 2400, max: 4400 }],
        countryCode: 'GB'
      },
      { 
        name: 'The Silence of the Lambs', 
        images: [
          { url: 'https://images.unsplash.com/photo-1571019614242-2c6a4313da9b?q=80&w=360', width: 360 }, 
          { url: 'https://images.unsplash.com/photo-1571019614242-2c6a4313da9b?q=80&w=196', width: 196 }
        ], 
        dates: { start: { localDate: '2025-08-08', localTime: '19:00' } }, 
        _embedded: { venues: [{ name: 'Cinema Madrid', city: { name: 'Madrid' }, country: { countryCode: 'ES' } }], attractions: [{ name: 'Jonathan Demme' }] }, 
        description: 'A psychological thriller.', 
        priceRanges: [{ type: 'standard', min: 230, max: 430 }, { type: 'VIP', min: 2300, max: 4300 }],
        countryCode: 'ES'
      },
      { 
        name: 'Inglourious Basterds', 
        images: [
          { url: 'https://images.unsplash.com/photo-1522869635100-9f4c5e86aa37?q=80&w=360', width: 360 }, 
          { url: 'https://images.unsplash.com/photo-1522869635100-9f4c5e86aa37?q=80&w=196', width: 196 }
        ], 
        dates: { start: { localDate: '2025-08-09', localTime: '20:30' } }, 
        _embedded: { venues: [{ name: 'Kino Vienna', city: { name: 'Vienna' }, country: { countryCode: 'AT' } }], attractions: [{ name: 'Quentin Tarantino' }] }, 
        description: 'A war film with a twist.', 
        priceRanges: [{ type: 'standard', min: 260, max: 460 }, { type: 'VIP', min: 2600, max: 4600 }],
        countryCode: 'AT'
      },
      { 
        name: 'La La Land', 
        images: [
          { url: 'https://images.unsplash.com/photo-1519689680058-324335c77eba?q=80&w=360', width: 360 }, 
          { url: 'https://images.unsplash.com/photo-1519689680058-324335c77eba?q=80&w=196', width: 196 }
        ], 
        dates: { start: { localDate: '2025-08-10', localTime: '18:00' } }, 
        _embedded: { venues: [{ name: 'Cineplex Singapore', city: { name: 'Singapore' }, country: { countryCode: 'SG' } }], attractions: [{ name: 'Damien Chazelle' }] }, 
        description: 'A musical romance about dreams.', 
        priceRanges: [{ type: 'standard', min: 270, max: 470 }, { type: 'VIP', min: 2700, max: 4700 }],
        countryCode: 'SG'
      }
    ];

    const arr = [];
    const repeats = Math.ceil((totalPages * eventsPerPage) / base.length);
    for (let i = 0; i < repeats; i++) {
      base.forEach((ev, idx) => {
        arr.push({
          ...ev,
          name: `${ev.name} #${i * base.length + idx + 1}`
        });
      });
    }
    return arr.slice(0, totalPages * eventsPerPage);
  };

  const fetchEvents = async () => {
    if (isFetching) {
      console.log('Fetch already in progress, skipping...');
      return;
    }
    isFetching = true;

    try {
      const url = `https://app.ticketmaster.com/discovery/v2/events.json?segmentName=Film&size=100&apikey=49FrD8b5pF7reRwv5Ebt667wyQ9AQQPZ`;
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
      const data = await response.json();
      console.log('API Response:', JSON.stringify(data, null, 2));

      if (data._embedded?.events?.length) {
        allEvents = data._embedded.events.map(event => {
          const images = event.images?.filter(img => img.url && img.url.match(/^https?:\/\//)) || [
            { url: `https://images.unsplash.com/photo-1506748686214-e9df14d4d9d0?q=80&w=360`, width: 360 },
            { url: `https://images.unsplash.com/photo-1506748686214-e9df14d4d9d0?q=80&w=196`, width: 196 }
          ];
          const countryCode = event._embedded?.venues?.[0]?.country?.countryCode || 'Unknown';
          console.log(`Event: ${event.name}, Country: ${countryCode}, Images:`, JSON.stringify(images, null, 2));
          return {
            ...event,
            countryCode,
            description: event.description || event.info || 'No description available.',
            images
          };
        }).filter((e, i, self) => i === self.findIndex(ev => ev.name === e.name));

        console.log(`Loaded ${allEvents.length} events from API`);
      } else {
        console.warn('No events from API, using test events');
        allEvents = getTestEvents();
      }

      if (allEvents.length < totalPages * eventsPerPage) {
        const need = totalPages * eventsPerPage - allEvents.length;
        console.log(`Padding with ${need} test events`);
        allEvents = allEvents.concat(getTestEvents().slice(0, need));
      }

      console.log('Total events loaded:', allEvents.length, 'First event:', JSON.stringify(allEvents[0], null, 2));
      populateCountrySelect();
      filterAndRenderEvents();
    } catch (error) {
      console.error('Error fetching events:', error);
      allEvents = getTestEvents();
      populateCountrySelect();
      filterAndRenderEvents();
    } finally {
      isFetching = false;
    }
  };

  if (searchInput) searchInput.addEventListener('input', () => {
    console.log('Search input triggered');
    filterAndRenderEvents();
  });
  if (countrySelect) countrySelect.addEventListener('change', () => {
    console.log('Country select changed:', countrySelect.value);
    filterAndRenderEvents();
  });

  fetchEvents();
});
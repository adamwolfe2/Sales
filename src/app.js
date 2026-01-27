/**
 * VendingPreneurs Sales Command Center
 * Enterprise-grade sales coaching and objection handling tool
 */

class SalesCommandCenter {
  constructor() {
    this.objections = null;
    this.playbooks = null;
    this.testimonials = null;
    this.reps = null;
    this.pricing = null;
    this.callAnalytics = null;
    this.jobSuperpowers = null;
    this.financing = null;
    this.quiz = null;
    this.currentView = 'objections';
    this.searchIndex = [];

    // Quiz state
    this.quizState = {
      currentQuestionIndex: 0,
      answers: {},
      selectedCategory: 'all',
      selectedDifficulty: 'all',
      filteredQuestions: [],
      showingResults: false,
      reviewMode: false
    };
  }

  async init() {
    try {
      await this.loadData();
      this.buildSearchIndex();
      this.bindEvents();
      this.renderCurrentView();
      console.log('Sales Command Center initialized');
    } catch (error) {
      console.error('Failed to initialize:', error);
      this.showError('Failed to load data. Please refresh the page.');
    }
  }

  async loadData() {
    // Helper to safely fetch JSON with error handling
    const safeFetch = async (url, name) => {
      try {
        const response = await fetch(url);
        if (!response.ok) {
          console.warn(`Failed to load ${name}: ${response.status}`);
          return null;
        }
        return await response.json();
      } catch (error) {
        console.warn(`Error loading ${name}:`, error);
        return null;
      }
    };

    // Load all data with individual error handling
    const [objections, playbooks, testimonials, reps, pricing, callAnalytics, jobSuperpowers, financing, quiz] = await Promise.all([
      safeFetch('data/objections.json', 'objections'),
      safeFetch('data/playbooks.json', 'playbooks'),
      safeFetch('data/testimonials.json', 'testimonials'),
      safeFetch('data/reps.json', 'reps'),
      safeFetch('data/pricing.json', 'pricing'),
      safeFetch('data/call-analytics.json', 'call-analytics'),
      safeFetch('data/job-superpowers.json', 'job-superpowers'),
      safeFetch('data/financing.json', 'financing'),
      safeFetch('data/quiz.json', 'quiz')
    ]);

    this.objections = objections || { objections: [], categories: [], patterns: {} };
    this.playbooks = playbooks || { frameworks: {}, quick_reference: {} };
    this.testimonials = testimonials || { full_testimonials: [], by_objection_type: {}, revenue_proof_points: [] };
    this.reps = reps || { reps: [], team_averages: {}, critical_gaps: [] };
    this.pricing = pricing || { packages: {}, financing_options: {}, credit_score_recommendations: { tiers: {} }, addons: {} };
    this.callAnalytics = callAnalytics || { job_type_patterns: {}, emotional_triggers: {}, winning_closes: {}, lost_deal_reasons: {}, followup_patterns: {}, analytics: { outcome_summary: {}, objection_frequency: {} }, metadata: {} };
    this.jobSuperpowers = jobSuperpowers || {};
    this.financing = financing || {};
    this.quiz = quiz || { categories: [], questions: [] };
  }

  buildSearchIndex() {
    this.searchIndex = [];

    // Index objections
    if (this.objections && this.objections.objections) {
      this.objections.objections.forEach(obj => {
        this.searchIndex.push({
          type: 'objection',
          id: obj.id,
          name: obj.name,
          category: obj.category,
          searchText: [
            obj.name,
            ...(obj.variations || []),
            obj.category
          ].join(' ').toLowerCase(),
          data: obj
        });
      });
    }

    // Index playbook frameworks
    if (this.playbooks && this.playbooks.frameworks) {
      Object.entries(this.playbooks.frameworks).forEach(([key, framework]) => {
        if (framework.phases) {
          Object.entries(framework.phases).forEach(([phaseKey, phase]) => {
            this.searchIndex.push({
              type: 'playbook',
              id: `${key}_${phaseKey}`,
              name: phase.name,
              author: framework.name,
              searchText: [phase.name, framework.name, phaseKey].join(' ').toLowerCase(),
              data: { ...phase, author: framework.name, authorKey: key }
            });
          });
        }
      });
    }

    // Index testimonials
    if (this.testimonials && this.testimonials.full_testimonials) {
      this.testimonials.full_testimonials.forEach(test => {
        this.searchIndex.push({
          type: 'testimonial',
          id: test.id,
          name: test.name,
          searchText: [
            test.name,
            test.quote,
            ...(test.tags || []),
            ...(test.objection_counters || [])
          ].join(' ').toLowerCase(),
          data: test
        });
      });
    }

    // Index pricing packages
    if (this.pricing && this.pricing.packages) {
      Object.entries(this.pricing.packages).forEach(([key, pkg]) => {
        this.searchIndex.push({
          type: 'pricing',
          id: key,
          name: pkg.name,
          searchText: [
            pkg.name,
            pkg.best_for,
            ...(pkg.features || []),
            key
          ].join(' ').toLowerCase(),
          data: pkg
        });
      });
    }

    // Index job superpowers
    if (this.jobSuperpowers && this.jobSuperpowers.job_superpowers) {
      this.jobSuperpowers.job_superpowers.forEach(job => {
        this.searchIndex.push({
          type: 'job',
          id: job.id,
          name: job.title,
          category: job.category,
          searchText: [
            job.title,
            job.category,
            ...job.superpowers.map(s => s.skill + ' ' + s.vending_application)
          ].join(' ').toLowerCase(),
          data: job
        });
      });
    }

    // Index financing options
    if (this.pricing && this.pricing.financing_options) {
      Object.entries(this.pricing.financing_options).forEach(([key, opt]) => {
        this.searchIndex.push({
          type: 'financing',
          id: key,
          name: opt.name,
          searchText: [
            opt.name,
            opt.timeline || '',
            ...(opt.benefits || [])
          ].join(' ').toLowerCase(),
          data: opt
        });
      });
    }

    // Index job type patterns
    if (this.callAnalytics && this.callAnalytics.job_type_patterns) {
      Object.entries(this.callAnalytics.job_type_patterns).forEach(([key, pattern]) => {
        this.searchIndex.push({
          type: 'job_pattern',
          id: key,
          name: key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
          searchText: [
            key,
            ...pattern.jobs,
            pattern.motivation,
            pattern.approach,
            ...pattern.common_objections
          ].join(' ').toLowerCase(),
          data: pattern
        });
      });
    }

    // Index emotional triggers
    if (this.callAnalytics && this.callAnalytics.emotional_triggers) {
      Object.entries(this.callAnalytics.emotional_triggers).forEach(([key, trigger]) => {
        this.searchIndex.push({
          type: 'trigger',
          id: key,
          name: key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
          searchText: [
            key,
            ...(trigger.phrases || []),
            trigger.response
          ].join(' ').toLowerCase(),
          data: trigger
        });
      });
    }

    // Index financing payment options
    if (this.financing && this.financing.payment_options) {
      this.financing.payment_options.forEach(option => {
        this.searchIndex.push({
          type: 'financing',
          id: option.id,
          name: option.name,
          searchText: [
            option.name,
            option.short_name,
            option.best_for,
            ...(option.keywords || []),
            ...(option.highlights || [])
          ].join(' ').toLowerCase(),
          data: option
        });
      });
    }
  }

  bindEvents() {
    // Navigation
    document.querySelectorAll('[data-nav]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        this.currentView = e.target.dataset.nav;
        this.updateNav();
        this.renderCurrentView();
      });
    });

    // Search
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => this.handleSearch(e.target.value));
      searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
          searchInput.value = '';
          this.handleSearch('');
        }
      });
    }

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if (e.key === '/' && !e.target.matches('input, textarea')) {
        e.preventDefault();
        document.getElementById('search-input')?.focus();
      }
      if (e.key === 'Escape') {
        this.closeModal();
      }
    });
  }

  updateNav() {
    document.querySelectorAll('[data-nav]').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.nav === this.currentView);
    });
  }

  renderCurrentView() {
    const content = document.getElementById('main-content');
    if (!content) return;

    switch (this.currentView) {
      case 'objections':
        this.renderObjections(content);
        break;
      case 'playbooks':
        this.renderPlaybooks(content);
        break;
      case 'pricing':
        this.renderPricing(content);
        break;
      case 'reps':
        this.renderReps(content);
        break;
      case 'prospects':
        this.renderProspectProfiles(content);
        break;
      case 'testimonials':
        this.renderTestimonials(content);
        break;
      case 'analytics':
        this.renderCallAnalytics(content);
        break;
      case 'analyzer':
        this.renderAnalyzer(content);
        break;
      case 'financing':
        this.renderFinancing(content);
        break;
      case 'quiz':
        this.renderQuiz(content);
        break;
      default:
        this.renderObjections(content);
    }
  }

  handleSearch(query) {
    if (!query.trim()) {
      this.renderCurrentView();
      return;
    }

    const results = this.search(query);
    this.renderSearchResults(results, query);
  }

  search(query) {
    const terms = query.toLowerCase().split(' ').filter(t => t.length > 1);

    return this.searchIndex
      .map(item => {
        let score = 0;
        terms.forEach(term => {
          if (item.searchText.includes(term)) {
            score += 1;
            if (item.name.toLowerCase().includes(term)) score += 2;
          }
        });
        return { ...item, score };
      })
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 20);
  }

  renderSearchResults(results, query) {
    const content = document.getElementById('main-content');
    if (!content) return;

    if (results.length === 0) {
      content.innerHTML = `
        <div class="empty-state">
          <h3>No results found for "${this.escapeHtml(query)}"</h3>
          <p>Try different keywords or browse the categories above.</p>
        </div>
      `;
      return;
    }

    const grouped = {
      objection: results.filter(r => r.type === 'objection'),
      playbook: results.filter(r => r.type === 'playbook'),
      testimonial: results.filter(r => r.type === 'testimonial'),
      pricing: results.filter(r => r.type === 'pricing'),
      financing: results.filter(r => r.type === 'financing'),
      job_pattern: results.filter(r => r.type === 'job_pattern'),
      trigger: results.filter(r => r.type === 'trigger')
    };

    content.innerHTML = `
      <div class="search-results">
        <div class="results-header">
          <h2>Search Results</h2>
          <span class="results-count">${results.length} results for "${this.escapeHtml(query)}"</span>
        </div>

        ${grouped.objection.length ? `
          <div class="results-section">
            <h3>Objections</h3>
            <div class="results-grid">
              ${grouped.objection.map(r => this.renderObjectionCard(r.data)).join('')}
            </div>
          </div>
        ` : ''}

        ${grouped.playbook.length ? `
          <div class="results-section">
            <h3>Playbook Frameworks</h3>
            <div class="results-list">
              ${grouped.playbook.map(r => this.renderPlaybookResult(r)).join('')}
            </div>
          </div>
        ` : ''}

        ${grouped.testimonial.length ? `
          <div class="results-section">
            <h3>Testimonials</h3>
            <div class="results-list">
              ${grouped.testimonial.map(r => this.renderTestimonialCard(r.data)).join('')}
            </div>
          </div>
        ` : ''}

        ${grouped.pricing.length ? `
          <div class="results-section">
            <h3>Pricing Packages</h3>
            <div class="results-list">
              ${grouped.pricing.map(r => `
                <div class="search-result-item" onclick="app.currentView='pricing';app.updateNav();app.renderCurrentView();">
                  <span class="result-type">Package</span>
                  <span class="result-name">${r.name} - $${r.data.price.toLocaleString()}</span>
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}

        ${grouped.financing.length ? `
          <div class="results-section">
            <h3>Financing Options</h3>
            <div class="results-list">
              ${grouped.financing.map(r => `
                <div class="search-result-item" onclick="app.showPaymentOptionsInfoModal()">
                  <span class="result-type">Financing</span>
                  <span class="result-name">${r.name} - ${r.data.timeline || ''}</span>
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}

        ${grouped.job_pattern.length ? `
          <div class="results-section">
            <h3>Job Type Patterns</h3>
            <div class="results-list">
              ${grouped.job_pattern.map(r => `
                <div class="search-result-item" onclick="app.showJobPatternModal('${r.id}')">
                  <span class="result-type">Job Pattern</span>
                  <span class="result-name">${r.name}</span>
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}

        ${grouped.trigger.length ? `
          <div class="results-section">
            <h3>Emotional Triggers</h3>
            <div class="results-list">
              ${grouped.trigger.map(r => `
                <div class="search-result-item" onclick="app.showEmotionalTriggerModal('${r.id}')">
                  <span class="result-type">Trigger</span>
                  <span class="result-name">${r.name}</span>
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}
      </div>
    `;

    this.bindResultEvents();
  }

  renderObjections(container) {
    if (!this.objections) return;

    const categories = this.objections.categories || [];
    const objectionsList = this.objections.objections || [];

    container.innerHTML = `
      <div class="view-header">
        <h2>Objection Handler</h2>
        <p>Real-time objection handling guidance. Click any objection for detailed scripts and strategies.</p>
      </div>

      <div class="stats-bar">
        <div class="stat">
          <span class="stat-value">${objectionsList.length}</span>
          <span class="stat-label">Objections Covered</span>
        </div>
        <div class="stat">
          <span class="stat-value">${categories.length}</span>
          <span class="stat-label">Categories</span>
        </div>
        <div class="stat">
          <span class="stat-value">2</span>
          <span class="stat-label">Expert Approaches</span>
        </div>
      </div>

      <div class="category-filters">
        <button class="filter-btn active" data-category="all">All Objections</button>
        ${categories.map(cat => `
          <button class="filter-btn" data-category="${cat.id}">
            ${cat.name.replace(' Objections', '').replace('/Decision-Maker', '')}
          </button>
        `).join('')}
      </div>

      <div class="objections-grid" id="objections-grid">
        ${objectionsList.map(obj => this.renderObjectionCard(obj)).join('')}
      </div>
    `;

    this.bindObjectionFilters();
    this.bindResultEvents();
  }

  renderObjectionCard(obj) {
    return `
      <div class="objection-card" data-objection-id="${obj.id}" data-category="${obj.category}">
        <div class="card-header">
          <span class="card-category-tag">${this.getCategoryName(obj.category).replace(' Objections', '').replace('/Decision-Maker', '')}</span>
        </div>
        <h3 class="card-title">${obj.name}</h3>
        <div class="card-preview">
          ${(obj.variations || []).slice(0, 2).map(v => `<span class="variation">"${v}"</span>`).join('')}
        </div>
      </div>
    `;
  }

  getDifficultyClass(winRate) {
    if (!winRate) return 'unknown';
    if (winRate >= 0.7) return 'favorable';
    if (winRate >= 0.5) return 'moderate';
    return 'challenging';
  }

  bindObjectionFilters() {
    document.querySelectorAll('.filter-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');

        const category = e.target.dataset.category;
        document.querySelectorAll('.objection-card').forEach(card => {
          if (category === 'all' || card.dataset.category === category) {
            card.style.display = '';
          } else {
            card.style.display = 'none';
          }
        });
      });
    });
  }

  bindResultEvents() {
    document.querySelectorAll('.objection-card').forEach(card => {
      card.addEventListener('click', () => {
        const id = card.dataset.objectionId;
        const obj = this.objections.objections.find(o => o.id === id);
        if (obj) this.showObjectionModal(obj);
      });
    });

    document.querySelectorAll('.testimonial-card').forEach(card => {
      card.addEventListener('click', () => {
        const id = card.dataset.testimonialId;
        const test = this.testimonials.full_testimonials.find(t => t.id === id);
        if (test) this.showTestimonialModal(test);
      });
    });
  }

  showObjectionModal(obj) {
    const modal = document.getElementById('modal');
    const modalContent = document.getElementById('modal-content');

    const mattResponse = obj.responses?.matt;
    const scottResponse = obj.responses?.scott;

    modalContent.innerHTML = `
      <div class="modal-header">
        <div class="modal-title-group">
          <span class="modal-category">${this.getCategoryName(obj.category)}</span>
          <h2>${obj.name}</h2>
        </div>
        <button class="modal-close" onclick="app.closeModal()">&times;</button>
      </div>

      <div class="modal-section">
        <h3>Common Variations</h3>
        <ul class="variations-list">
          ${(obj.variations || []).map(v => `<li>"${v}"</li>`).join('')}
        </ul>
      </div>

      ${mattResponse ? `
        <div class="modal-section response-section">
          <div class="response-header">
            <h3>Matt Chubb's Approach</h3>
          </div>
          ${mattResponse.philosophy ? `<p class="philosophy"><strong>Philosophy:</strong> "${mattResponse.philosophy}"</p>` : ''}
          ${mattResponse.primary_script ? `
            <div class="script-block">
              <div class="script-label">Primary Script</div>
              <blockquote class="script">${mattResponse.primary_script}</blockquote>
              <button class="copy-btn" onclick="app.copyToClipboard(\`${this.escapeForJs(mattResponse.primary_script)}\`)">Copy Script</button>
            </div>
          ` : ''}
          ${mattResponse.three_path_question ? `
            <div class="script-block">
              <div class="script-label">Three-Path Question</div>
              <blockquote class="script">${mattResponse.three_path_question}</blockquote>
              <button class="copy-btn" onclick="app.copyToClipboard(\`${this.escapeForJs(mattResponse.three_path_question)}\`)">Copy Script</button>
            </div>
          ` : ''}
          ${mattResponse.key_principles ? `
            <div class="principles">
              <strong>Key Principles:</strong>
              <ul>${mattResponse.key_principles.map(p => `<li>${p}</li>`).join('')}</ul>
            </div>
          ` : ''}
        </div>
      ` : ''}

      ${scottResponse ? `
        <div class="modal-section response-section">
          <div class="response-header">
            <h3>Scott Seymour's Approach</h3>
          </div>
          ${scottResponse.philosophy ? `<p class="philosophy"><strong>Philosophy:</strong> "${scottResponse.philosophy}"</p>` : ''}
          ${scottResponse.primary_script ? `
            <div class="script-block">
              <div class="script-label">Primary Script</div>
              <blockquote class="script">${scottResponse.primary_script}</blockquote>
              <button class="copy-btn" onclick="app.copyToClipboard(\`${this.escapeForJs(scottResponse.primary_script)}\`)">Copy Script</button>
            </div>
          ` : ''}
          ${scottResponse.key_principles ? `
            <div class="principles">
              <strong>Key Principles:</strong>
              <ul>${scottResponse.key_principles.map(p => `<li>${p}</li>`).join('')}</ul>
            </div>
          ` : ''}
        </div>
      ` : ''}
    `;

    modal.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  showTestimonialModal(test) {
    const modal = document.getElementById('modal');
    const modalContent = document.getElementById('modal-content');

    // Check if there's a matching job profile
    let jobProfile = null;
    if (test.job_profile && this.jobSuperpowers) {
      jobProfile = this.jobSuperpowers.job_superpowers.find(j => j.id === test.job_profile);
    }

    modalContent.innerHTML = `
      <div class="modal-header">
        <div class="modal-title-group">
          <span class="modal-category">Success Story</span>
          <h2>${test.name}</h2>
        </div>
        <button class="modal-close" onclick="app.closeModal()">&times;</button>
      </div>

      <div class="testimonial-meta">
        <p><strong>${test.title}</strong></p>
        ${test.business_name ? `<p>${test.business_name}</p>` : ''}
        ${test.location ? `<p>${test.location}</p>` : ''}
      </div>

      ${test.image ? `
        <div class="testimonial-image-container">
          <img src="${this.testimonials.metadata?.image_base_path || 'images/testimonials/'}${test.image}" alt="${test.name}'s testimonial" class="testimonial-image" onerror="this.style.display='none'">
        </div>
      ` : ''}

      ${test.results ? `
        <div class="modal-stats">
          ${test.results.locations || test.results.markets_live ? `
            <div class="modal-stat">
              <span class="stat-value">${test.results.locations || test.results.markets_live}</span>
              <span class="stat-label">Locations</span>
            </div>
          ` : ''}
          ${test.results.machines ? `
            <div class="modal-stat">
              <span class="stat-value">${test.results.machines}</span>
              <span class="stat-label">Machines</span>
            </div>
          ` : ''}
          ${test.results.monthly_revenue ? `
            <div class="modal-stat">
              <span class="stat-value">$${test.results.monthly_revenue.toLocaleString()}</span>
              <span class="stat-label">Monthly Revenue</span>
            </div>
          ` : ''}
          ${test.timeline ? `
            <div class="modal-stat">
              <span class="stat-value">${test.timeline}</span>
              <span class="stat-label">Timeline</span>
            </div>
          ` : ''}
        </div>
      ` : ''}

      <div class="modal-section">
        <h3>Their Story</h3>
        <blockquote class="testimonial-quote">${test.quote}</blockquote>
        <button class="copy-btn" onclick="app.copyToClipboard(\`${this.escapeForJs(test.quote)}\`)">Copy Quote</button>
      </div>

      ${jobProfile ? `
        <div class="modal-section">
          <h3>Background Superpowers</h3>
          <p class="section-intro">As a ${jobProfile.title.toLowerCase()}, ${test.name.split(' ')[0]} has transferable skills:</p>
          <div class="superpowers-list">
            ${jobProfile.superpowers.slice(0, 3).map(s => `
              <div class="superpower-item">
                <div class="skill-name">${s.skill}</div>
                <div class="skill-arrow">→</div>
                <div class="skill-application">${s.vending_application}</div>
              </div>
            `).join('')}
          </div>
        </div>
      ` : ''}

      ${test.objection_counters && test.objection_counters.length ? `
        <div class="modal-section">
          <h3>Use This Story For</h3>
          <div class="tags">
            ${test.objection_counters.map(o => `<span class="tag">${o}</span>`).join('')}
          </div>
        </div>
      ` : ''}

      ${test.tags && test.tags.length ? `
        <div class="modal-section">
          <h3>Tags</h3>
          <div class="tags">
            ${test.tags.map(t => `<span class="tag secondary">${t.replace(/_/g, ' ')}</span>`).join('')}
          </div>
        </div>
      ` : ''}
    `;

    modal.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  closeModal() {
    const modal = document.getElementById('modal');
    modal.classList.remove('open');
    document.body.style.overflow = '';
  }

  renderPlaybooks(container) {
    if (!this.playbooks) return;

    const frameworks = this.playbooks.frameworks;

    container.innerHTML = `
      <div class="view-header">
        <h2>Playbook Library</h2>
        <p>Complete sales frameworks from Eric, Matt, and Scott. Click any section for detailed scripts.</p>
      </div>

      <div class="playbook-grid">
        ${Object.entries(frameworks).map(([key, framework]) => `
          <div class="playbook-section">
            <h3>${framework.name}</h3>
            <p class="playbook-desc">${framework.description || ''}</p>
            ${framework.core_principles ? `
              <div class="principles-preview">
                <strong>Core Principles:</strong>
                <ul>
                  ${framework.core_principles.slice(0, 3).map(p => `<li>${p}</li>`).join('')}
                </ul>
              </div>
            ` : ''}
            ${framework.phases ? `
              <div class="phases-list">
                ${Object.entries(framework.phases).map(([phaseKey, phase]) => `
                  <div class="phase-item" data-playbook="${key}" data-phase="${phaseKey}">
                    <span class="phase-name">${phase.name}</span>
                    ${phase.duration_minutes ? `<span class="phase-duration">${phase.duration_minutes} min</span>` : ''}
                  </div>
                `).join('')}
              </div>
            ` : ''}
          </div>
        `).join('')}
      </div>

      <div class="quick-reference">
        <h3>Quick Reference Scripts</h3>
        <div class="quick-scripts">
          ${Object.entries(this.playbooks.quick_reference?.key_scripts_by_situation || {}).map(([situation, script]) => `
            <div class="quick-script">
              <div class="script-situation">${situation.replace(/_/g, ' ')}</div>
              <blockquote class="script">${script}</blockquote>
              <button class="copy-btn small" onclick="app.copyToClipboard(\`${this.escapeForJs(script)}\`)">Copy</button>
            </div>
          `).join('')}
        </div>
      </div>
    `;

    document.querySelectorAll('.phase-item').forEach(item => {
      item.addEventListener('click', () => {
        const playbook = item.dataset.playbook;
        const phase = item.dataset.phase;
        this.showPhaseModal(playbook, phase);
      });
    });
  }

  showPhaseModal(playbookKey, phaseKey) {
    const framework = this.playbooks.frameworks[playbookKey];
    const phase = framework.phases[phaseKey];

    const modal = document.getElementById('modal');
    const modalContent = document.getElementById('modal-content');

    modalContent.innerHTML = `
      <div class="modal-header">
        <div class="modal-title-group">
          <span class="modal-category">${framework.name}</span>
          <h2>${phase.name}</h2>
        </div>
        <button class="modal-close" onclick="app.closeModal()">&times;</button>
      </div>

      ${phase.duration_minutes ? `
        <div class="modal-stats">
          <div class="modal-stat">
            <span class="stat-value">${phase.duration_minutes}</span>
            <span class="stat-label">Minutes</span>
          </div>
        </div>
      ` : ''}

      ${this.renderPhaseContent(phase)}
    `;

    modal.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  renderPhaseContent(phase) {
    let html = '';

    if (phase.subsections) {
      Object.entries(phase.subsections).forEach(([key, section]) => {
        html += `<div class="modal-section">`;
        html += `<h3>${key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</h3>`;

        if (typeof section === 'object') {
          if (section.scripts && Array.isArray(section.scripts)) {
            html += `<div class="scripts-list">`;
            section.scripts.forEach(script => {
              html += `
                <div class="script-item">
                  <blockquote class="script">${script}</blockquote>
                  <button class="copy-btn small" onclick="app.copyToClipboard(\`${this.escapeForJs(script)}\`)">Copy</button>
                </div>
              `;
            });
            html += `</div>`;
          }

          if (section.primary) {
            html += `
              <div class="script-block">
                <div class="script-label">Primary</div>
                <blockquote class="script">${section.primary}</blockquote>
                <button class="copy-btn" onclick="app.copyToClipboard(\`${this.escapeForJs(section.primary)}\`)">Copy</button>
              </div>
            `;
          }

          if (section.variations && Array.isArray(section.variations)) {
            html += `<div class="variations"><strong>Variations:</strong><ul>`;
            section.variations.forEach(v => {
              html += `<li>${v}</li>`;
            });
            html += `</ul></div>`;
          }

          if (section.purpose) {
            html += `<p class="purpose"><strong>Purpose:</strong> ${section.purpose}</p>`;
          }
        }

        html += `</div>`;
      });
    }

    if (phase.key_elements) {
      html += `
        <div class="modal-section">
          <h3>Key Elements</h3>
          <ul>${Object.entries(phase.key_elements).map(([k, v]) => `<li><strong>${k.replace(/_/g, ' ')}:</strong> ${v}</li>`).join('')}</ul>
        </div>
      `;
    }

    return html;
  }

  renderPlaybookResult(result) {
    return `
      <div class="playbook-result" data-playbook="${result.data.authorKey}" data-phase="${result.id.split('_').slice(1).join('_')}">
        <span class="result-author">${result.data.author}</span>
        <span class="result-name">${result.name}</span>
      </div>
    `;
  }

  renderReps(container) {
    if (!this.reps) return;

    const repsList = this.reps.reps || [];

    container.innerHTML = `
      <div class="view-header">
        <h2>Team Resources</h2>
        <p>Team member profiles and strengths. Click any member to see their expertise areas.</p>
      </div>

      <div class="stats-bar">
        <div class="stat">
          <span class="stat-value">${repsList.length}</span>
          <span class="stat-label">Team Members</span>
        </div>
        <div class="stat">
          <span class="stat-value">Active</span>
          <span class="stat-label">Status</span>
        </div>
      </div>

      <div class="reps-grid">
        ${repsList.map(rep => this.renderRepCard(rep)).join('')}
      </div>
    `;

    document.querySelectorAll('.rep-card').forEach(card => {
      card.addEventListener('click', () => {
        const id = card.dataset.repId;
        const rep = repsList.find(r => r.id === id);
        if (rep) this.showRepModal(rep);
      });
    });
  }

  renderRepCard(rep) {
    return `
      <div class="rep-card" data-rep-id="${rep.id}">
        <div class="rep-header">
          <h3>${rep.name}</h3>
          <span class="rep-status">Active</span>
        </div>
        <div class="rep-strengths">
          ${rep.strengths ? rep.strengths.slice(0, 2).map(s => `<span class="strength">${s}</span>`).join('') : '<span class="strength">Sales Expert</span>'}
        </div>
      </div>
    `;
  }

  showRepModal(rep) {
    const modal = document.getElementById('modal');
    const modalContent = document.getElementById('modal-content');

    modalContent.innerHTML = `
      <div class="modal-header">
        <div class="modal-title-group">
          <span class="modal-category">Team Member</span>
          <h2>${rep.name}</h2>
        </div>
        <button class="modal-close" onclick="app.closeModal()">&times;</button>
      </div>

      ${rep.strengths ? `
        <div class="modal-section">
          <h3>Strengths & Expertise</h3>
          <ul class="strengths-list">
            ${rep.strengths.map(s => `<li>${s}</li>`).join('')}
          </ul>
        </div>
      ` : ''}

      ${rep.coaching_recommendations ? `
        <div class="modal-section">
          <h3>Focus Areas</h3>
          <ol class="coaching-list">
            ${rep.coaching_recommendations.map(c => `<li>${c}</li>`).join('')}
          </ol>
        </div>
      ` : ''}
    `;

    modal.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  renderTestimonials(container) {
    if (!this.testimonials) return;

    const fullTestimonials = this.testimonials.full_testimonials || [];
    const byObjection = this.testimonials.by_objection_type || {};
    const revenueProof = this.testimonials.revenue_proof_points || [];
    const jobPatterns = this.callAnalytics?.job_type_patterns || {};

    container.innerHTML = `
      <div class="view-header">
        <h2>Success Story Library</h2>
        <p>Social proof ammunition for presentations. Filter by objection type or prospect job category.</p>
      </div>

      <div class="stats-bar">
        <div class="stat">
          <span class="stat-value">${fullTestimonials.length}</span>
          <span class="stat-label">Full Stories</span>
        </div>
        <div class="stat">
          <span class="stat-value">${Object.keys(byObjection).length}</span>
          <span class="stat-label">Objection Types</span>
        </div>
        <div class="stat">
          <span class="stat-value">${revenueProof.length}</span>
          <span class="stat-label">Revenue Proof Points</span>
        </div>
      </div>

      <div class="filter-sections">
        <div class="filter-section">
          <label>Filter by Objection:</label>
          <div class="category-filters">
            <button class="filter-btn active" data-objection-type="all">All Stories</button>
            ${Object.keys(byObjection).map(type => `
              <button class="filter-btn" data-objection-type="${type}">
                ${type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </button>
            `).join('')}
          </div>
        </div>

        <div class="filter-section">
          <label>Filter by Prospect Job Type:</label>
          <div class="category-filters job-filters">
            <button class="filter-btn job-filter active" data-job-type="all">All Jobs</button>
            ${Object.entries(jobPatterns).map(([key, pattern]) => `
              <button class="filter-btn job-filter" data-job-type="${key}" title="${pattern.jobs.join(', ')}">
                ${key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </button>
            `).join('')}
          </div>
        </div>
      </div>

      <div class="testimonials-grid" id="testimonials-grid">
        ${fullTestimonials.map(test => this.renderTestimonialCardWithJobType(test, jobPatterns)).join('')}
      </div>

      <div class="revenue-proof">
        <h3>Revenue Proof Points</h3>
        <div class="proof-grid">
          ${revenueProof.map(proof => `
            <div class="proof-item">
              <span class="proof-value">${proof.description}</span>
              <span class="proof-source">${proof.source}</span>
              ${proof.timeline ? `<span class="proof-timeline">${proof.timeline}</span>` : ''}
              ${proof.machines ? `<span class="proof-detail">${proof.machines} machines</span>` : ''}
              ${proof.locations ? `<span class="proof-detail">${proof.locations} locations</span>` : ''}
            </div>
          `).join('')}
        </div>
      </div>
    `;

    this.bindTestimonialFilters();
    this.bindJobTypeFilters();
    this.bindResultEvents();
  }

  renderTestimonialCardWithJobType(test, jobPatterns) {
    // Use explicit job_type if available, otherwise fall back to text matching
    let matchedJobType = test.job_type || '';

    // Fallback: determine job type based on title or tags if not explicitly set
    if (!matchedJobType) {
      const titleLower = (test.title || '').toLowerCase();
      const tagsLower = (test.tags || []).join(' ').toLowerCase();
      const quoteLower = (test.quote || '').toLowerCase();
      const searchText = titleLower + ' ' + tagsLower + ' ' + quoteLower;

      Object.entries(jobPatterns).forEach(([key, pattern]) => {
        pattern.jobs.forEach(job => {
          if (searchText.includes(job.toLowerCase())) {
            matchedJobType = key;
          }
        });
      });
    }

    return `
      <div class="testimonial-card" data-testimonial-id="${test.id}" data-tags="${(test.objection_counters || []).join(' ')}" data-job-type="${matchedJobType}">
        <h3 class="testimonial-name">${test.name}</h3>
        <p class="testimonial-title">${test.title}</p>
        ${test.business_name ? `<p class="testimonial-business">${test.business_name}</p>` : ''}
        <p class="testimonial-preview">"${(test.quote || '').substring(0, 150)}..."</p>
        ${test.results ? `
          <div class="testimonial-results">
            ${test.results.locations ? `<span>${test.results.locations} locations</span>` : ''}
            ${test.results.machines ? `<span>${test.results.machines} machines</span>` : ''}
            ${test.results.monthly_revenue ? `<span>$${test.results.monthly_revenue.toLocaleString()}/mo</span>` : ''}
          </div>
        ` : ''}
        <div class="testimonial-tags">
          ${test.objection_counters ? test.objection_counters.slice(0, 2).map(o => `<span class="tag small">${o}</span>`).join('') : ''}
          ${matchedJobType ? `<span class="tag small job-tag">${matchedJobType.replace(/_/g, ' ')}</span>` : ''}
        </div>
      </div>
    `;
  }

  bindJobTypeFilters() {
    document.querySelectorAll('.job-filter').forEach(btn => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('.job-filter').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');

        const jobType = e.target.dataset.jobType;

        document.querySelectorAll('.testimonial-card').forEach(card => {
          if (jobType === 'all' || card.dataset.jobType === jobType) {
            card.style.display = '';
          } else {
            card.style.display = 'none';
          }
        });
      });
    });
  }

  renderTestimonialCard(test) {
    return `
      <div class="testimonial-card" data-testimonial-id="${test.id}" data-tags="${(test.objection_counters || []).join(' ')}">
        <h3 class="testimonial-name">${test.name}</h3>
        <p class="testimonial-title">${test.title}</p>
        ${test.business_name ? `<p class="testimonial-business">${test.business_name}</p>` : ''}
        <p class="testimonial-preview">"${(test.quote || '').substring(0, 150)}..."</p>
        ${test.results ? `
          <div class="testimonial-results">
            ${test.results.locations ? `<span>${test.results.locations} locations</span>` : ''}
            ${test.results.machines ? `<span>${test.results.machines} machines</span>` : ''}
            ${test.results.monthly_revenue ? `<span>$${test.results.monthly_revenue.toLocaleString()}/mo</span>` : ''}
          </div>
        ` : ''}
        ${test.objection_counters ? `
          <div class="testimonial-tags">
            ${test.objection_counters.slice(0, 2).map(o => `<span class="tag small">${o}</span>`).join('')}
          </div>
        ` : ''}
      </div>
    `;
  }

  bindTestimonialFilters() {
    document.querySelectorAll('[data-objection-type]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('[data-objection-type]').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');

        const type = e.target.dataset.objectionType;

        if (type === 'all') {
          document.querySelectorAll('.testimonial-card').forEach(card => {
            card.style.display = '';
          });
        } else {
          const relevantStories = this.testimonials.by_objection_type[type] || [];
          const relevantNames = relevantStories.map(s => s.name.toLowerCase());

          document.querySelectorAll('.testimonial-card').forEach(card => {
            const name = card.querySelector('.testimonial-name')?.textContent.toLowerCase() || '';
            const tags = card.dataset.tags?.toLowerCase() || '';
            const typeFormatted = type.replace(/_/g, ' ');

            if (relevantNames.some(n => name.includes(n.toLowerCase())) ||
                tags.includes(typeFormatted)) {
              card.style.display = '';
            } else {
              card.style.display = 'none';
            }
          });
        }
      });
    });
  }

  renderProspectProfiles(container) {
    if (!this.jobSuperpowers) {
      container.innerHTML = '<div class="empty-state"><h3>Prospect profiles not available</h3></div>';
      return;
    }

    const jobs = this.jobSuperpowers.job_superpowers || [];
    const categories = this.jobSuperpowers.categories || [];

    container.innerHTML = `
      <div class="view-header">
        <h2>Prospect Profiles</h2>
        <p>Understand how prospects' existing skills translate to vending success. Use this to relate to their background.</p>
      </div>

      <div class="stats-bar">
        <div class="stat">
          <span class="stat-value">${jobs.length}</span>
          <span class="stat-label">Job Profiles</span>
        </div>
        <div class="stat">
          <span class="stat-value">${categories.length}</span>
          <span class="stat-label">Categories</span>
        </div>
      </div>

      <div class="category-filters">
        <button class="filter-btn active" data-job-category="all">All Profiles</button>
        ${categories.map(cat => `
          <button class="filter-btn" data-job-category="${cat.id}">
            ${cat.name}
          </button>
        `).join('')}
      </div>

      <div class="prospects-grid" id="prospects-grid">
        ${jobs.map(job => this.renderJobCard(job)).join('')}
      </div>
    `;

    // Bind filter events
    document.querySelectorAll('[data-job-category]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('[data-job-category]').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');

        const category = e.target.dataset.jobCategory;
        document.querySelectorAll('.job-card').forEach(card => {
          if (category === 'all' || card.dataset.category === category) {
            card.style.display = '';
          } else {
            card.style.display = 'none';
          }
        });
      });
    });

    // Bind card click events
    document.querySelectorAll('.job-card').forEach(card => {
      card.addEventListener('click', () => {
        const id = card.dataset.jobId;
        const job = jobs.find(j => j.id === id);
        if (job) this.showJobModal(job);
      });
    });
  }

  renderJobCard(job) {
    const topSkills = job.superpowers.slice(0, 2);
    return `
      <div class="job-card" data-job-id="${job.id}" data-category="${job.category}">
        <h3 class="job-title">${job.title}</h3>
        <div class="job-skills-preview">
          ${topSkills.map(s => `<span class="skill-tag">${s.skill}</span>`).join('')}
        </div>
      </div>
    `;
  }

  showJobModal(job) {
    const modal = document.getElementById('modal');
    const modalContent = document.getElementById('modal-content');

    modalContent.innerHTML = `
      <div class="modal-header">
        <div class="modal-title-group">
          <span class="modal-category">Prospect Profile</span>
          <h2>${job.title}</h2>
        </div>
        <button class="modal-close" onclick="app.closeModal()">&times;</button>
      </div>

      <div class="modal-section">
        <h3>Vending Superpowers</h3>
        <p class="section-intro">How their existing skills translate to vending success:</p>
        <div class="superpowers-list">
          ${job.superpowers.map(s => `
            <div class="superpower-item">
              <div class="skill-name">${s.skill}</div>
              <div class="skill-arrow">→</div>
              <div class="skill-application">${s.vending_application}</div>
            </div>
          `).join('')}
        </div>
      </div>

      <div class="modal-section">
        <h3>Use in Conversation</h3>
        <div class="script-block">
          <blockquote class="script">"Based on your background as a ${job.title.toLowerCase()}, you already have incredible skills that translate perfectly to vending. Your ${job.superpowers[0].skill.toLowerCase()} means you'll naturally ${job.superpowers[0].vending_application.toLowerCase()}."</blockquote>
          <button class="copy-btn" onclick="app.copyToClipboard('Based on your background as a ${job.title.toLowerCase()}, you already have incredible skills that translate perfectly to vending. Your ${job.superpowers[0].skill.toLowerCase()} means you\\'ll naturally ${job.superpowers[0].vending_application.toLowerCase()}.')">Copy Script</button>
        </div>
      </div>
    `;

    modal.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  renderFinancing(container) {
    if (!this.financing) {
      container.innerHTML = '<div class="empty-state"><h3>Financing data not available</h3></div>';
      return;
    }

    const options = this.financing.payment_options || [];
    const creditGuide = this.financing.credit_score_guide || {};

    container.innerHTML = `
      <div class="view-header">
        <h2>Financing Options</h2>
        <p>Quick reference for payment options. Recommend the right financing based on credit score.</p>
      </div>

      <div class="credit-score-guide">
        <h3>Credit Score Recommendation</h3>
        <p class="discovery-question">"${this.financing.discovery_question}"</p>
        <div class="credit-tiers">
          ${Object.entries(creditGuide).map(([key, tier]) => `
            <div class="credit-tier ${key}">
              <div class="tier-header">
                <span class="tier-range">${tier.range}</span>
                <span class="tier-label">${tier.label}</span>
              </div>
              <div class="tier-recommendation">
                ${tier.recommended_order.map((opt, i) => `<span class="rec-option">${this.getFinancingName(opt)}</span>${i < tier.recommended_order.length - 1 ? ' → ' : ''}`).join('')}
              </div>
              <p class="tier-note">${tier.note}</p>
            </div>
          `).join('')}
        </div>
      </div>

      <div class="financing-grid">
        ${options.map(option => this.renderFinancingCard(option)).join('')}
      </div>

      <div class="creative-options">
        <h3>Creative Payment Solutions</h3>
        <ul>
          ${this.financing.creative_options.map(opt => `<li>${opt}</li>`).join('')}
        </ul>
      </div>

      <div class="last-resort">
        <h3>If Declined by All Options</h3>
        <div class="last-resort-list">
          ${this.financing.last_resort_options.map(opt => `<span class="last-resort-tag">${opt}</span>`).join('')}
        </div>
      </div>
    `;

    // Bind card clicks
    document.querySelectorAll('.financing-card').forEach(card => {
      card.addEventListener('click', () => {
        const id = card.dataset.financingId;
        const option = options.find(o => o.id === id);
        if (option) this.showFinancingModal(option);
      });
    });
  }

  renderFinancingCard(option) {
    return `
      <div class="financing-card" data-financing-id="${option.id}">
        <div class="financing-header">
          <h3 class="financing-name">${option.name}</h3>
          <span class="financing-timeline">${option.timeline}</span>
        </div>
        <div class="financing-details">
          <div class="financing-detail">
            <span class="detail-label">Fee</span>
            <span class="detail-value">${option.fee}</span>
          </div>
          <div class="financing-detail">
            <span class="detail-label">APR</span>
            <span class="detail-value">${option.apr}</span>
          </div>
        </div>
        <p class="financing-best-for">${option.best_for}</p>
        ${option.restrictions && option.restrictions.length ? `
          <div class="financing-restrictions">
            ${option.restrictions.map(r => `<span class="restriction-tag">${r}</span>`).join('')}
          </div>
        ` : ''}
      </div>
    `;
  }

  showFinancingModal(option) {
    const modal = document.getElementById('modal');
    const modalContent = document.getElementById('modal-content');

    modalContent.innerHTML = `
      <div class="modal-header">
        <div class="modal-title-group">
          <span class="modal-category">Payment Option</span>
          <h2>${option.name}</h2>
        </div>
        <button class="modal-close" onclick="app.closeModal()">&times;</button>
      </div>

      <div class="modal-stats">
        <div class="modal-stat">
          <span class="stat-value">${option.timeline}</span>
          <span class="stat-label">Terms</span>
        </div>
        <div class="modal-stat">
          <span class="stat-value">${option.fee}</span>
          <span class="stat-label">Fee</span>
        </div>
        <div class="modal-stat">
          <span class="stat-value">${option.apr}</span>
          <span class="stat-label">APR</span>
        </div>
      </div>

      <div class="modal-section">
        <h3>Best For</h3>
        <p>${option.best_for}</p>
      </div>

      <div class="modal-section">
        <h3>Key Points</h3>
        <ul class="highlights-list">
          ${option.highlights.map(h => `<li>${h}</li>`).join('')}
        </ul>
      </div>

      ${option.restrictions && option.restrictions.length ? `
        <div class="modal-section">
          <h3>Restrictions</h3>
          <div class="tags">
            ${option.restrictions.map(r => `<span class="tag restriction">${r}</span>`).join('')}
          </div>
        </div>
      ` : ''}
    `;

    modal.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  getFinancingName(id) {
    const names = {
      'elective': 'Elective',
      'klarna': 'Klarna',
      'payva': 'Payva',
      'coach': 'Coach',
      'split_it': 'Split It',
      'pif': 'Pay in Full',
      'paypal': 'PayPal'
    };
    return names[id] || id;
  }

  renderAnalyzer(container) {
    container.innerHTML = `
      <div class="view-header">
        <h2>Call Analyzer</h2>
        <p>Enter objections from your call to get instant script recommendations.</p>
      </div>

      <div class="analyzer-input">
        <textarea id="analyzer-objections" placeholder="Enter objections you're hearing on this call, one per line...&#10;&#10;Example:&#10;I don't have the capital right now&#10;I need to talk to my spouse"></textarea>
        <button class="btn-primary" onclick="app.analyzeCall()">Find Scripts</button>
      </div>

      <div id="analyzer-results"></div>

      <div class="patterns-reference">
        <h3>Quick Tips</h3>

        <div class="pattern-section">
          <h4>Re-qualification Script</h4>
          <p>Use this when you're hearing multiple objections to find the real concern:</p>
          <div class="script-block">
            <blockquote class="script">On a scale of 1-10, how serious are you about starting a vending business in the next 90 days?</blockquote>
            <button class="copy-btn" onclick="app.copyToClipboard('On a scale of 1-10, how serious are you about starting a vending business in the next 90 days?')">Copy</button>
          </div>
        </div>

        <div class="pattern-section">
          <h4>Finding the Real Objection</h4>
          <p>Most objections are masks for something else. Key questions to uncover the truth:</p>
          <div class="script-block">
            <blockquote class="script">If we could solve that, would you be ready to move forward today?</blockquote>
            <button class="copy-btn" onclick="app.copyToClipboard('If we could solve that, would you be ready to move forward today?')">Copy</button>
          </div>
        </div>

        ${this.callAnalytics?.followup_patterns ? `
          <div class="pattern-section followup-patterns-section">
            <h4>Follow-up Patterns</h4>
            <p class="section-desc">How to respond when prospects need time</p>
            <div class="followup-patterns-grid">
              ${Object.entries(this.callAnalytics.followup_patterns).map(([key, pattern]) => `
                <div class="followup-pattern-card ${pattern.success_rate.toLowerCase().replace(/[- ]/g, '_')}">
                  <h5>${key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</h5>
                  <p class="pattern-request">"${pattern.request}"</p>
                  <div class="pattern-response">
                    <strong>Say:</strong> "${pattern.response}"
                    <button class="copy-btn small" onclick="app.copyToClipboard('${this.escapeForJs(pattern.response)}')">Copy</button>
                  </div>
                  <span class="success-rate-badge">${pattern.success_rate}</span>
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}

        ${this.callAnalytics?.lost_deal_reasons ? `
          <div class="pattern-section lost-deals-section">
            <h4>Lost Deal Prevention</h4>
            <p class="section-desc">Recognize and prevent these patterns</p>
            <div class="lost-deals-prevention-grid">
              ${Object.entries(this.callAnalytics.lost_deal_reasons).map(([key, reason]) => `
                <div class="lost-deal-prevention-card">
                  <h5>${key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</h5>
                  <p class="deal-pattern"><strong>Warning Sign:</strong> "${reason.pattern}"</p>
                  <p class="deal-solution"><strong>Solution:</strong> ${reason.solution}</p>
                  <p class="deal-prevention"><strong>Prevention:</strong> ${reason.prevention}</p>
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}
      </div>
    `;
  }

  analyzeCall() {
    const textarea = document.getElementById('analyzer-objections');
    const resultsDiv = document.getElementById('analyzer-results');

    if (!textarea || !resultsDiv) return;

    const input = textarea.value.trim();
    if (!input) {
      resultsDiv.innerHTML = '<p class="empty-state">Enter what the prospect is saying to get instant suggestions.</p>';
      return;
    }

    const inputLower = input.toLowerCase();
    const lines = input.split('\n').filter(l => l.trim());

    // Match objections
    const matchedObjections = [];
    lines.forEach(line => {
      const matches = this.searchIndex
        .filter(item => item.type === 'objection')
        .map(item => ({
          ...item,
          score: this.fuzzyMatch(line.toLowerCase(), item.searchText)
        }))
        .filter(item => item.score > 0.3)
        .sort((a, b) => b.score - a.score);

      if (matches.length > 0) {
        matchedObjections.push({
          input: line,
          match: matches[0]
        });
      }
    });

    // Detect job mentions
    const matchedJobs = [];
    if (this.jobSuperpowers) {
      this.jobSuperpowers.job_superpowers.forEach(job => {
        const titleWords = job.title.toLowerCase().split(/[\s\/]+/);
        const matched = titleWords.some(word => word.length > 3 && inputLower.includes(word));
        if (matched) {
          matchedJobs.push(job);
        }
      });
    }

    // Detect financing concerns
    const financingTriggers = this.detectFinancingTriggers(inputLower);

    // Detect testimonial opportunities
    const matchedTestimonials = this.findRelevantTestimonials(inputLower);

    const count = matchedObjections.length;
    const categories = [...new Set(matchedObjections.map(m => m.match.data.category))];

    // Build results HTML
    let html = `
      <div class="analyzer-summary">
        <h3>Real-Time Suggestions</h3>
        <div class="summary-stats">
          <div class="summary-stat">
            <span class="stat-value">${count}</span>
            <span class="stat-label">Objections</span>
          </div>
          <div class="summary-stat">
            <span class="stat-value">${matchedJobs.length}</span>
            <span class="stat-label">Job Matches</span>
          </div>
          <div class="summary-stat">
            <span class="stat-value">${financingTriggers.length}</span>
            <span class="stat-label">Financing Cues</span>
          </div>
        </div>
      </div>
    `;

    // Three objection tip
    if (count >= 3) {
      html += `
        <div class="analyzer-alert tip">
          <h4>Pro Tip: Multiple Objections</h4>
          <p><strong>Recommended:</strong> Re-qualify this prospect to find their main concern</p>
          <div class="script-block">
            <blockquote class="script">"On a scale of 1-10, how serious are you about starting a vending business in the next 90 days?"</blockquote>
            <button class="copy-btn" onclick="app.copyToClipboard('On a scale of 1-10, how serious are you about starting a vending business in the next 90 days?')">Copy</button>
          </div>
        </div>
      `;
    }

    // Job profile matches
    if (matchedJobs.length > 0) {
      html += `
        <div class="analyzer-section job-matches">
          <h4>Background Detected - Use Their Experience</h4>
          ${matchedJobs.slice(0, 2).map(job => `
            <div class="suggestion-card job-suggestion" onclick="app.showJobModal(app.jobSuperpowers.job_superpowers.find(j => j.id === '${job.id}'))">
              <div class="suggestion-header">
                <span class="suggestion-type">Job Profile</span>
                <span class="suggestion-title">${job.title}</span>
              </div>
              <div class="suggestion-script">
                <p>"Your experience with <strong>${job.superpowers[0].skill.toLowerCase()}</strong> means you'll naturally <strong>${job.superpowers[0].vending_application.toLowerCase()}</strong>."</p>
              </div>
              <button class="copy-btn small" onclick="event.stopPropagation(); app.copyToClipboard('Your experience with ${job.superpowers[0].skill.toLowerCase()} means you\\'ll naturally ${job.superpowers[0].vending_application.toLowerCase()}.')">Copy</button>
            </div>
          `).join('')}
        </div>
      `;
    }

    // Financing triggers
    if (financingTriggers.length > 0) {
      html += `
        <div class="analyzer-section financing-matches">
          <h4>Financing Concern Detected</h4>
          ${financingTriggers.map(trigger => `
            <div class="suggestion-card financing-suggestion">
              <div class="suggestion-header">
                <span class="suggestion-type">${trigger.type}</span>
                <span class="suggestion-title">${trigger.title}</span>
              </div>
              <div class="suggestion-script">
                <p>${trigger.script}</p>
              </div>
              <button class="copy-btn small" onclick="app.copyToClipboard(\`${this.escapeForJs(trigger.script)}\`)">Copy</button>
              ${trigger.recommended ? `
                <div class="recommended-options">
                  <span class="rec-label">Recommend:</span>
                  ${trigger.recommended.map(opt => `<span class="rec-option">${this.getFinancingName(opt)}</span>`).join(' → ')}
                </div>
              ` : ''}
            </div>
          `).join('')}
        </div>
      `;
    }

    // Objection matches
    if (matchedObjections.length > 0) {
      html += `
        <div class="analyzer-section objection-matches">
          <h4>Objections Detected - Click for Scripts</h4>
          ${matchedObjections.map(m => `
            <div class="matched-item" onclick="app.showObjectionModal(app.objections.objections.find(o => o.id === '${m.match.id}'))">
              <div class="matched-input">"${m.input}"</div>
              <div class="matched-result">
                <span class="matched-name">${m.match.data.name}</span>
                <span class="matched-category">${this.getCategoryName(m.match.data.category).replace(' Objections', '')}</span>
              </div>
              <button class="btn-small">View Scripts</button>
            </div>
          `).join('')}
        </div>
      `;
    }

    // Relevant testimonials
    if (matchedTestimonials.length > 0) {
      html += `
        <div class="analyzer-section testimonial-matches">
          <h4>Relevant Success Stories</h4>
          ${matchedTestimonials.slice(0, 2).map(test => `
            <div class="suggestion-card testimonial-suggestion" onclick="app.showTestimonialModal(app.testimonials.full_testimonials.find(t => t.id === '${test.id}'))">
              <div class="suggestion-header">
                <span class="suggestion-type">Success Story</span>
                <span class="suggestion-title">${test.name}</span>
              </div>
              <p class="suggestion-preview">${test.title}${test.results?.monthly_revenue ? ` - $${test.results.monthly_revenue.toLocaleString()}/mo` : ''}</p>
            </div>
          `).join('')}
        </div>
      `;
    }

    resultsDiv.innerHTML = html;
  }

  detectFinancingTriggers(input) {
    const triggers = [];

    if (!this.financing) return triggers;

    // Check for affordability concerns
    const affordKeywords = ['afford', 'expensive', 'cost', 'budget', 'money', 'price', 'pay'];
    if (affordKeywords.some(k => input.includes(k))) {
      triggers.push({
        type: 'Affordability',
        title: 'Payment Concern Detected',
        script: "I totally understand budget is a concern. The good news is we have several flexible payment options. Do you roughly know what your credit score is? That helps me point you to the best fit.",
        recommended: ['split_it', 'elective', 'payva']
      });
    }

    // Check for credit concerns
    const creditKeywords = ['credit', 'score', 'declined', 'bad credit', 'no credit'];
    if (creditKeywords.some(k => input.includes(k))) {
      triggers.push({
        type: 'Credit Concern',
        title: 'Credit Score Mentioned',
        script: "No worries at all - we work with everyone. Payva approves anyone regardless of credit, and Coach Financing offers terms up to 144 months to keep payments low.",
        recommended: ['payva', 'coach']
      });
    }

    // Check for payment term concerns
    const termKeywords = ['monthly', 'payments', 'month', 'long term', '24', 'longer'];
    if (termKeywords.some(k => input.includes(k))) {
      triggers.push({
        type: 'Payment Terms',
        title: 'Longer Terms Needed',
        script: "We can definitely work with that. Klarna offers up to 24 months, and Coach Financing can go up to 144 months if you need really low monthly payments.",
        recommended: ['klarna', 'coach']
      });
    }

    // Check for California
    if (input.includes('california') || input.includes(' ca ') || input.includes('los angeles') || input.includes('san francisco')) {
      triggers.push({
        type: 'Location',
        title: 'California Resident',
        script: "Just a heads up - Elective isn't available in California, but we have great alternatives. Klarna and Payva both work great for CA residents.",
        recommended: ['klarna', 'payva']
      });
    }

    return triggers;
  }

  findRelevantTestimonials(input) {
    if (!this.testimonials || !this.testimonials.full_testimonials) return [];

    const relevant = [];
    const keywords = input.split(/\s+/).filter(w => w.length > 3);

    this.testimonials.full_testimonials.forEach(test => {
      const testText = [
        test.name,
        test.title,
        test.quote,
        ...(test.tags || []),
        ...(test.objection_counters || [])
      ].join(' ').toLowerCase();

      const matchCount = keywords.filter(k => testText.includes(k)).length;
      if (matchCount >= 2) {
        relevant.push({ ...test, matchScore: matchCount });
      }
    });

    return relevant.sort((a, b) => b.matchScore - a.matchScore);
  }

  fuzzyMatch(input, target) {
    const inputWords = input.split(/\s+/);
    let score = 0;

    inputWords.forEach(word => {
      if (word.length > 2 && target.includes(word)) {
        score += 1 / inputWords.length;
      }
    });

    return score;
  }

  getCategoryName(categoryId) {
    const category = this.objections?.categories?.find(c => c.id === categoryId);
    return category?.name || categoryId.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }

  copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
      this.showToast('Copied to clipboard');
    }).catch(() => {
      this.showToast('Failed to copy');
    });
  }

  showToast(message) {
    const existing = document.querySelector('.toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    }, 2000);
  }

  showError(message) {
    const content = document.getElementById('main-content');
    if (content) {
      content.innerHTML = `
        <div class="error-state">
          <h3>Error</h3>
          <p>${message}</p>
        </div>
      `;
    }
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  escapeForJs(text) {
    return (text || '').replace(/`/g, '\\`').replace(/\$/g, '\\$');
  }

  renderPricing(container) {
    if (!this.pricing) {
      container.innerHTML = '<div class="empty-state"><h3>Pricing data not available</h3><p>Please refresh the page.</p></div>';
      return;
    }

    const packages = this.pricing.packages || {};
    const financing = this.pricing.financing_options || {};
    const creditRecs = this.pricing.credit_score_recommendations || { tiers: {}, prompt: '' };

    container.innerHTML = `
      <div class="view-header">
        <h2>Pricing Calculator</h2>
        <p>Complete payment links and financing options. Click any package to see all payment methods.</p>
      </div>

      <div class="credit-score-guide">
        <h3>Credit Score Recommendation Guide</h3>
        <p class="guide-prompt">"${creditRecs.prompt}"</p>
        <div class="credit-tiers">
          ${Object.entries(creditRecs.tiers).map(([key, tier]) => `
            <div class="credit-tier" data-tier="${key}">
              <h4>${tier.label}</h4>
              <div class="tier-flow">${tier.priority_order.map(opt =>
                `<span class="flow-item">${this.getFinancingName(opt)}</span>`
              ).join('<span class="flow-arrow">→</span>')}</div>
              <p class="tier-notes">${tier.notes}</p>
            </div>
          `).join('')}
        </div>
      </div>

      <div class="packages-grid">
        ${Object.entries(packages).map(([key, pkg]) => `
          <div class="package-card ${pkg.most_popular ? 'popular' : ''}" data-package="${key}">
            ${pkg.most_popular ? '<div class="popular-badge">MOST POPULAR</div>' : ''}
            <div class="package-header">
              <h3>${pkg.name}</h3>
              <div class="package-price">
                <span class="price-amount">$${pkg.price.toLocaleString()}</span>
                <span class="price-duration">/ ${pkg.duration_months} months</span>
              </div>
            </div>
            <p class="package-best-for"><strong>BEST FOR:</strong> ${pkg.best_for}</p>
            <ul class="package-features">
              ${pkg.features.map(f => `<li>${f}</li>`).join('')}
            </ul>
            <button class="btn-primary view-payments" data-package="${key}">View Payment Options</button>
          </div>
        `).join('')}
      </div>

      <div class="addons-section">
        <h3>Add-Ons</h3>
        <div class="addons-grid">
          ${Object.entries(this.pricing.addons).map(([key, addon]) => `
            <div class="addon-card">
              <h4>${addon.name}</h4>
              ${addon.price ? `<div class="addon-price">$${addon.price.toLocaleString()}</div>` : ''}
              ${addon.savings ? `<div class="addon-savings">Save $${addon.savings}</div>` : ''}
              <p>${addon.description}</p>
              <a href="${addon.url}" target="_blank" class="btn-secondary">Checkout Link</a>
            </div>
          `).join('')}
        </div>
      </div>

      <div class="financing-reference">
        <h3>Financing Options Reference</h3>
        <div class="financing-grid">
          ${Object.entries(financing).filter(([k]) => k !== 'paypal').map(([key, opt]) => `
            <div class="financing-card">
              <h4>${opt.name}</h4>
              <div class="financing-timeline">${opt.timeline}</div>
              ${opt.fee_percentage ? `<div class="financing-fee">+${opt.fee_percentage}% fee</div>` : ''}
              <ul class="financing-benefits">
                ${opt.benefits.map(b => `<li>${b}</li>`).join('')}
              </ul>
            </div>
          `).join('')}
        </div>
      </div>
    `;

    // Bind payment option click events
    document.querySelectorAll('.view-payments').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const pkgKey = e.target.dataset.package;
        this.showPaymentOptionsModal(pkgKey);
      });
    });
  }

  getFinancingName(key) {
    const names = {
      'elective': 'Elective',
      'klarna': 'Klarna',
      'payva': 'Payva',
      'coach': 'Coach',
      'pif': 'PIF'
    };
    return names[key] || key;
  }

  showPaymentOptionsModal(packageKey) {
    const pkg = this.pricing.packages[packageKey];
    if (!pkg) return;

    const modal = document.getElementById('modal');
    const modalContent = document.getElementById('modal-content');

    modalContent.innerHTML = `
      <div class="modal-header">
        <div class="modal-title-group">
          <span class="modal-category">Payment Options</span>
          <h2>${pkg.name} - $${pkg.price.toLocaleString()}</h2>
        </div>
        <button class="modal-close" onclick="app.closeModal()">&times;</button>
      </div>

      <div class="modal-section">
        <p><strong>Best For:</strong> ${pkg.best_for}</p>
      </div>

      <div class="payment-options-grid">
        ${Object.entries(pkg.payment_options).map(([key, opt]) => `
          <div class="payment-option-card">
            <div class="payment-option-header">
              <h4>${opt.name}</h4>
              <span class="payment-price">$${opt.price.toLocaleString()}</span>
            </div>
            <p class="payment-desc">${opt.description}</p>
            <a href="${opt.url}" target="_blank" class="btn-primary payment-link" onclick="app.copyPaymentLink('${opt.url}', event)">
              Open Checkout
            </a>
            <button class="btn-secondary copy-link" onclick="app.copyToClipboard('${opt.url}')">
              Copy Link
            </button>
          </div>
        `).join('')}
      </div>
    `;

    modal.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  copyPaymentLink(url, event) {
    navigator.clipboard.writeText(url).then(() => {
      this.showToast('Link copied to clipboard');
    });
  }

  showPaymentOptionsInfoModal() {
    if (!this.pricing?.financing_options) {
      this.showToast('Pricing data not available');
      return;
    }
    const modal = document.getElementById('modal');
    const modalContent = document.getElementById('modal-content');
    const financing = this.pricing.financing_options;
    const creditRecs = this.pricing.credit_score_recommendations || { tiers: {}, prompt: '' };

    modalContent.innerHTML = `
      <div class="modal-header">
        <div class="modal-title-group">
          <span class="modal-category">Reference Guide</span>
          <h2>Payment Options Information</h2>
        </div>
        <button class="modal-close" onclick="app.closeModal()">&times;</button>
      </div>

      <div class="modal-section">
        <h3>Credit Score Recommendation Guide</h3>
        <p class="guide-prompt">"${creditRecs.prompt}"</p>
        <div class="credit-tiers-modal">
          ${Object.entries(creditRecs.tiers).map(([key, tier]) => `
            <div class="credit-tier-modal">
              <h4>${tier.label}</h4>
              <div class="tier-flow">${tier.priority_order.map(opt =>
                `<span class="flow-item">${this.getFinancingName(opt)}</span>`
              ).join('<span class="flow-arrow">→</span>')}</div>
              <p class="tier-notes">${tier.notes}</p>
            </div>
          `).join('')}
        </div>
      </div>

      <div class="modal-section">
        <h3>Financing Options Details</h3>
        <div class="financing-details-grid">
          ${Object.entries(financing).filter(([k]) => k !== 'paypal').map(([key, opt]) => `
            <div class="financing-detail-card">
              <h4>${opt.name}</h4>
              <div class="financing-meta">
                <span class="financing-timeline">${opt.timeline}</span>
                ${opt.fee_percentage ? `<span class="financing-fee">+${opt.fee_percentage}% fee</span>` : ''}
              </div>
              <ul class="financing-benefits">
                ${opt.benefits.map(b => `<li>${b}</li>`).join('')}
              </ul>
            </div>
          `).join('')}
        </div>
      </div>

      <div class="modal-section">
        <h3>PayPal Options</h3>
        ${financing.paypal ? `
          <div class="paypal-options">
            <div class="paypal-option">
              <h4>Pay in 4</h4>
              <p><strong>APR:</strong> ${financing.paypal.variants.pay_in_4.apr}</p>
              <p><strong>Range:</strong> ${financing.paypal.variants.pay_in_4.range}</p>
              <p><strong>Terms:</strong> ${financing.paypal.variants.pay_in_4.terms}</p>
              <p><strong>Credit Check:</strong> ${financing.paypal.variants.pay_in_4.credit_check}</p>
            </div>
            <div class="paypal-option">
              <h4>Pay Monthly</h4>
              <p><strong>APR:</strong> ${financing.paypal.variants.pay_monthly.apr}</p>
              <p><strong>Range:</strong> ${financing.paypal.variants.pay_monthly.range}</p>
              <p><strong>Terms:</strong> ${financing.paypal.variants.pay_monthly.terms}</p>
            </div>
          </div>
        ` : ''}
      </div>
    `;

    modal.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  showEmotionalTriggerModal(triggerKey) {
    if (!this.callAnalytics?.emotional_triggers) {
      this.showToast('Emotional triggers data not available');
      return;
    }
    const trigger = this.callAnalytics.emotional_triggers[triggerKey];
    if (!trigger) return;

    const modal = document.getElementById('modal');
    const modalContent = document.getElementById('modal-content');

    modalContent.innerHTML = `
      <div class="modal-header">
        <div class="modal-title-group">
          <span class="modal-category">Emotional Trigger</span>
          <h2>${triggerKey.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</h2>
        </div>
        <button class="modal-close" onclick="app.closeModal()">&times;</button>
      </div>

      <div class="modal-section">
        <h3>Listen For These Phrases</h3>
        <div class="trigger-phrases-modal">
          ${trigger.phrases.map(p => `<span class="trigger-phrase-lg">"${p}"</span>`).join('')}
        </div>
      </div>

      <div class="modal-section">
        <h3>How to Respond</h3>
        <blockquote class="script">${trigger.response}</blockquote>
        <button class="copy-btn" onclick="app.copyToClipboard(\`${this.escapeForJs(trigger.response)}\`)">Copy Response</button>
      </div>

      ${trigger.testimonials ? `
        <div class="modal-section">
          <h3>Testimonials to Use</h3>
          <ul>
            ${trigger.testimonials.map(t => `<li>${t}</li>`).join('')}
          </ul>
        </div>
      ` : ''}
    `;

    modal.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  showCreditScoreRecommender() {
    if (!this.pricing?.credit_score_recommendations) {
      this.showToast('Pricing data not available');
      return;
    }
    const modal = document.getElementById('modal');
    const modalContent = document.getElementById('modal-content');
    const creditRecs = this.pricing.credit_score_recommendations;

    modalContent.innerHTML = `
      <div class="modal-header">
        <div class="modal-title-group">
          <span class="modal-category">Quick Tool</span>
          <h2>Credit Score Financing Recommender</h2>
        </div>
        <button class="modal-close" onclick="app.closeModal()">&times;</button>
      </div>

      <div class="modal-section">
        <h3>Enter Credit Score</h3>
        <div class="credit-input-wrapper">
          <input type="number" id="credit-score-input" placeholder="Enter credit score (e.g., 680)" min="300" max="850" class="credit-score-input">
          <button class="btn-primary" onclick="app.calculateFinancingRecommendation()">Get Recommendation</button>
        </div>
        <div id="financing-recommendation" class="financing-recommendation"></div>
      </div>

      <div class="modal-section">
        <h3>Quick Reference</h3>
        <div class="credit-tiers-modal">
          ${Object.entries(creditRecs.tiers).map(([key, tier]) => `
            <div class="credit-tier-modal">
              <h4>${tier.label}</h4>
              <div class="tier-flow">${tier.priority_order.map(opt =>
                `<span class="flow-item">${this.getFinancingName(opt)}</span>`
              ).join('<span class="flow-arrow">→</span>')}</div>
              <p class="tier-notes">${tier.notes}</p>
            </div>
          `).join('')}
        </div>
      </div>
    `;

    modal.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  calculateFinancingRecommendation() {
    const input = document.getElementById('credit-score-input');
    const resultDiv = document.getElementById('financing-recommendation');
    const score = parseInt(input.value);

    if (!score || score < 300 || score > 850) {
      resultDiv.innerHTML = '<p class="error">Please enter a valid credit score between 300 and 850.</p>';
      return;
    }

    let tier, tierData;
    if (score >= 650) {
      tier = '650_plus';
      tierData = this.pricing.credit_score_recommendations.tiers['650_plus'];
    } else if (score >= 600) {
      tier = '600_650';
      tierData = this.pricing.credit_score_recommendations.tiers['600_650'];
    } else {
      tier = 'below_600';
      tierData = this.pricing.credit_score_recommendations.tiers['below_600'];
    }

    const primaryOption = tierData.priority_order[0];
    const financingDetails = this.pricing.financing_options[primaryOption];

    resultDiv.innerHTML = `
      <div class="recommendation-result">
        <div class="recommendation-header">
          <h4>Credit Score: ${score}</h4>
          <span class="tier-badge">${tierData.label}</span>
        </div>
        <div class="recommended-option">
          <h4>Recommended: ${this.getFinancingName(primaryOption)}</h4>
          ${financingDetails ? `
            <p class="option-timeline">${financingDetails.timeline}</p>
            <ul class="option-benefits">
              ${financingDetails.benefits.slice(0, 3).map(b => `<li>${b}</li>`).join('')}
            </ul>
          ` : ''}
        </div>
        <div class="fallback-options">
          <strong>Fallback Order:</strong>
          <div class="tier-flow">${tierData.priority_order.map(opt =>
            `<span class="flow-item">${this.getFinancingName(opt)}</span>`
          ).join('<span class="flow-arrow">→</span>')}</div>
        </div>
        <p class="tier-notes">${tierData.notes}</p>
      </div>
    `;
  }

  showRepLanguagePanel() {
    const repLanguage = this.objections?.rep_language_patterns;
    if (!repLanguage) {
      this.showToast('Rep language patterns not available');
      return;
    }

    const modal = document.getElementById('modal');
    const modalContent = document.getElementById('modal-content');

    modalContent.innerHTML = `
      <div class="modal-header">
        <div class="modal-title-group">
          <span class="modal-category">Quick Reference</span>
          <h2>Rep Language Patterns</h2>
        </div>
        <button class="modal-close" onclick="app.closeModal()">&times;</button>
      </div>

      <div class="language-patterns-grid">
        <div class="language-section trust-builders">
          <h3>Trust Builders</h3>
          <p class="section-hint">Use these to build rapport and reduce resistance</p>
          <ul>
            ${repLanguage.trust_builders.map(phrase => `
              <li class="copyable-phrase" onclick="app.copyToClipboard('${this.escapeForJs(phrase)}')">${phrase}</li>
            `).join('')}
          </ul>
        </div>

        <div class="language-section urgency-creators">
          <h3>Urgency Creators</h3>
          <p class="section-hint">Create urgency without pressure</p>
          <ul>
            ${repLanguage.urgency_creators.map(phrase => `
              <li class="copyable-phrase" onclick="app.copyToClipboard('${this.escapeForJs(phrase)}')">${phrase}</li>
            `).join('')}
          </ul>
        </div>

        <div class="language-section price-handlers">
          <h3>Price Handlers</h3>
          <p class="section-hint">Reframe investment and value</p>
          <ul>
            ${repLanguage.price_handlers.map(phrase => `
              <li class="copyable-phrase" onclick="app.copyToClipboard('${this.escapeForJs(phrase)}')">${phrase}</li>
            `).join('')}
          </ul>
        </div>

        <div class="language-section skepticism-overcomers">
          <h3>Skepticism Overcomers</h3>
          <p class="section-hint">Address doubt and build credibility</p>
          <ul>
            ${repLanguage.skepticism_overcomers.map(phrase => `
              <li class="copyable-phrase" onclick="app.copyToClipboard('${this.escapeForJs(phrase)}')">${phrase}</li>
            `).join('')}
          </ul>
        </div>
      </div>

      ${this.callAnalytics?.winning_closes ? `
      <div class="modal-section">
        <h3>Winning Close Signals</h3>
        <p class="section-hint">When you hear these, move to close immediately</p>
        <div class="close-signals-quick">
          ${Object.entries(this.callAnalytics.winning_closes).map(([key, close]) => `
            <div class="close-signal-quick">
              <span class="signal-text">"${close.signal}"</span>
              <span class="signal-action">${close.action}</span>
            </div>
          `).join('')}
        </div>
      </div>
      ` : ''}
    `;

    modal.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  showDangerComboAlert(categories) {
    const patterns = this.objections?.patterns?.dangerous_combos || [];
    let dangerCombo = null;

    patterns.forEach(combo => {
      const hasAll = combo.objections.every(obj =>
        categories.some(cat => cat.includes(obj) || obj.includes(cat))
      );
      if (hasAll) {
        dangerCombo = combo;
      }
    });

    if (dangerCombo) {
      const alertDiv = document.createElement('div');
      alertDiv.className = 'danger-combo-alert';
      alertDiv.innerHTML = `
        <div class="danger-combo-content">
          <h4>Danger Combination Detected!</h4>
          <p><strong>${dangerCombo.objections.map(o => this.getCategoryName(o)).join(' + ')}</strong></p>
          <p>Combined win rate: <strong>${Math.round(dangerCombo.win_rate * 100)}%</strong></p>
          <div class="protocol">
            <strong>Protocol:</strong>
            <ol>${dangerCombo.protocol.map(p => `<li>${p}</li>`).join('')}</ol>
          </div>
          <button class="btn-primary" onclick="this.parentElement.parentElement.remove()">Got it</button>
        </div>
      `;
      document.body.appendChild(alertDiv);

      setTimeout(() => alertDiv.classList.add('show'), 10);
    }
  }

  renderOutcomeChart(outcomes) {
    if (!outcomes) return '';
    const total = (outcomes.WON || 0) + (outcomes.LOST || 0) + (outcomes.FOLLOWUP || 0);
    if (total === 0) return '<div class="no-data">No data available</div>';

    const wonPercent = ((outcomes.WON || 0) / total) * 100;
    const lostPercent = ((outcomes.LOST || 0) / total) * 100;
    const followupPercent = ((outcomes.FOLLOWUP || 0) / total) * 100;

    // Create a horizontal stacked bar chart
    return `
      <div class="stacked-bar-chart">
        <div class="bar-segment won" style="width: ${wonPercent}%" title="Won: ${outcomes.WON || 0}"></div>
        <div class="bar-segment lost" style="width: ${lostPercent}%" title="Lost: ${outcomes.LOST || 0}"></div>
        <div class="bar-segment followup" style="width: ${followupPercent}%" title="Follow-up: ${outcomes.FOLLOWUP || 0}"></div>
      </div>
      <div class="bar-percentages">
        <span class="percent won">${Math.round(wonPercent)}%</span>
        <span class="percent lost">${Math.round(lostPercent)}%</span>
        <span class="percent followup">${Math.round(followupPercent)}%</span>
      </div>
    `;
  }

  renderCallAnalytics(container) {
    if (!this.callAnalytics) {
      container.innerHTML = '<div class="empty-state"><h3>Analytics data not available</h3><p>Please refresh the page.</p></div>';
      return;
    }

    const analytics = this.callAnalytics.analytics || { outcome_summary: {}, objection_frequency: {} };
    const jobPatterns = this.callAnalytics.job_type_patterns || {};
    const creditPatterns = this.callAnalytics.credit_score_patterns || {};
    const emotionalTriggers = this.callAnalytics.emotional_triggers || {};
    const winningCloses = this.callAnalytics.winning_closes || {};

    container.innerHTML = `
      <div class="view-header">
        <h2>Call Analytics</h2>
        <p>Patterns from ${this.callAnalytics.metadata.total_calls_analyzed} calls analyzed. Use these insights to improve close rates.</p>
      </div>

      <div class="stats-bar">
        <div class="stat">
          <span class="stat-value">${this.callAnalytics.metadata?.total_calls_analyzed || 0}</span>
          <span class="stat-label">Calls Analyzed</span>
        </div>
        <div class="stat">
          <span class="stat-value">${Math.round((analytics.outcome_summary?.followup_rate || 0) * 100)}%</span>
          <span class="stat-label">Follow-up Rate</span>
        </div>
        <div class="stat">
          <span class="stat-value">${analytics.objection_frequency?.PRICE || 0}</span>
          <span class="stat-label">Price Objections</span>
        </div>
        <div class="stat">
          <span class="stat-value">${analytics.objection_frequency?.SPOUSE || 0}</span>
          <span class="stat-label">Spouse Objections</span>
        </div>
      </div>

      <div class="analytics-section">
        <h3>Call Outcomes</h3>
        <div class="outcome-chart-container">
          <div class="outcome-chart">
            ${this.renderOutcomeChart(analytics.outcome_summary)}
          </div>
          <div class="outcome-legend">
            <div class="legend-item won">
              <span class="legend-dot"></span>
              <span class="legend-label">Won</span>
              <span class="legend-value">${analytics.outcome_summary?.WON || 0}</span>
            </div>
            <div class="legend-item lost">
              <span class="legend-dot"></span>
              <span class="legend-label">Lost</span>
              <span class="legend-value">${analytics.outcome_summary?.LOST || 0}</span>
            </div>
            <div class="legend-item followup">
              <span class="legend-dot"></span>
              <span class="legend-label">Follow-up</span>
              <span class="legend-value">${analytics.outcome_summary?.FOLLOWUP || 0}</span>
            </div>
          </div>
        </div>
      </div>

      <div class="analytics-section">
        <h3>Objection Frequency</h3>
        <div class="objection-bars">
          ${Object.entries(analytics.objection_frequency)
            .sort((a, b) => b[1] - a[1])
            .map(([obj, count]) => {
              const maxCount = Math.max(...Object.values(analytics.objection_frequency));
              const percentage = (count / maxCount) * 100;
              return `
                <div class="objection-bar-item">
                  <span class="bar-label">${obj}</span>
                  <div class="bar-container">
                    <div class="bar-fill" style="width: ${percentage}%"></div>
                  </div>
                  <span class="bar-count">${count}</span>
                </div>
              `;
            }).join('')}
        </div>
      </div>

      <div class="analytics-section">
        <h3>Patterns by Job Type</h3>
        <p class="section-desc">Click any job category to see detailed approach and testimonials.</p>
        <div class="job-patterns-grid">
          ${Object.entries(jobPatterns).map(([key, pattern]) => `
            <div class="job-pattern-card" data-job="${key}">
              <h4>${key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</h4>
              <div class="job-examples">${pattern.jobs.slice(0, 4).join(', ')}${pattern.jobs.length > 4 ? '...' : ''}</div>
              <div class="job-motivation"><strong>Motivation:</strong> ${pattern.motivation}</div>
              <div class="job-objections"><strong>Common:</strong> ${pattern.common_objections.join(', ')}</div>
            </div>
          `).join('')}
        </div>
      </div>

      <div class="analytics-section">
        <h3>Emotional Triggers</h3>
        <p class="section-desc">Identify these triggers in discovery to build urgency and close deals.</p>
        <div class="triggers-grid">
          ${Object.entries(emotionalTriggers).map(([key, trigger]) => `
            <div class="trigger-card">
              <h4>${key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</h4>
              <div class="trigger-phrases">
                ${trigger.phrases.map(p => `<span class="trigger-phrase">"${p}"</span>`).join('')}
              </div>
              <p class="trigger-response"><strong>Response:</strong> ${trigger.response}</p>
              ${trigger.testimonials ? `<p class="trigger-testimonials"><strong>Use:</strong> ${trigger.testimonials.join(', ')}</p>` : ''}
            </div>
          `).join('')}
        </div>
      </div>

      <div class="analytics-section">
        <h3>Credit Score Patterns</h3>
        <div class="credit-patterns-grid">
          ${Object.entries(creditPatterns).map(([key, pattern]) => `
            <div class="credit-pattern-card ${pattern.win_rate_correlation.toLowerCase().replace(/[- ]/g, '_')}">
              <h4>${key.replace(/_/g, ' ')}</h4>
              <p><strong>Behavior:</strong> ${pattern.behavior}</p>
              <p><strong>Approach:</strong> ${pattern.approach}</p>
              <span class="correlation-badge">${pattern.win_rate_correlation}</span>
            </div>
          `).join('')}
        </div>
      </div>

      <div class="analytics-section">
        <h3>Winning Close Signals</h3>
        <p class="section-desc">When you hear these, move to close immediately.</p>
        <div class="winning-closes-grid">
          ${Object.entries(winningCloses).map(([key, close]) => `
            <div class="close-signal-card">
              <h4>${key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</h4>
              <div class="close-signal">"${close.signal}"</div>
              <p><strong>Meaning:</strong> ${close.meaning}</p>
              <p class="close-action"><strong>Action:</strong> ${close.action}</p>
            </div>
          `).join('')}
        </div>
      </div>

      <div class="analytics-section">
        <h3>Lost Deal Reasons</h3>
        <div class="lost-deals-grid">
          ${Object.entries(this.callAnalytics.lost_deal_reasons).map(([key, reason]) => `
            <div class="lost-deal-card">
              <h4>${key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</h4>
              <p><strong>Pattern:</strong> "${reason.pattern}"</p>
              <p><strong>Solution:</strong> ${reason.solution}</p>
              <p class="prevention"><strong>Prevention:</strong> ${reason.prevention}</p>
            </div>
          `).join('')}
        </div>
      </div>
    `;

    // Bind job pattern click events
    document.querySelectorAll('.job-pattern-card').forEach(card => {
      card.addEventListener('click', () => {
        const jobKey = card.dataset.job;
        this.showJobPatternModal(jobKey);
      });
    });
  }

  showJobPatternModal(jobKey) {
    if (!this.callAnalytics?.job_type_patterns) {
      this.showToast('Job patterns data not available');
      return;
    }
    const pattern = this.callAnalytics.job_type_patterns[jobKey];
    if (!pattern) return;

    const modal = document.getElementById('modal');
    const modalContent = document.getElementById('modal-content');

    modalContent.innerHTML = `
      <div class="modal-header">
        <div class="modal-title-group">
          <span class="modal-category">Job Type Pattern</span>
          <h2>${jobKey.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</h2>
        </div>
        <button class="modal-close" onclick="app.closeModal()">&times;</button>
      </div>

      <div class="modal-section">
        <h3>Job Titles</h3>
        <div class="tags">
          ${pattern.jobs.map(j => `<span class="tag">${j}</span>`).join('')}
        </div>
      </div>

      <div class="modal-section">
        <h3>Motivation</h3>
        <p>${pattern.motivation}</p>
      </div>

      <div class="modal-section">
        <h3>Common Objections</h3>
        <div class="tags">
          ${pattern.common_objections.map(o => `<span class="tag warning">${o}</span>`).join('')}
        </div>
      </div>

      <div class="modal-section">
        <h3>Recommended Approach</h3>
        <p>${pattern.approach}</p>
      </div>

      ${pattern.emotional_trigger ? `
        <div class="modal-section">
          <h3>Emotional Trigger</h3>
          <blockquote>"${pattern.emotional_trigger}"</blockquote>
        </div>
      ` : ''}

      ${pattern.win_signals ? `
        <div class="modal-section">
          <h3>Win Signals</h3>
          <ul>
            ${pattern.win_signals.map(s => `<li>${s}</li>`).join('')}
          </ul>
        </div>
      ` : ''}

      ${pattern.testimonials_to_use ? `
        <div class="modal-section">
          <h3>Testimonials to Use</h3>
          <ul>
            ${pattern.testimonials_to_use.map(t => `<li>${t}</li>`).join('')}
          </ul>
        </div>
      ` : ''}

      ${pattern.caution ? `
        <div class="modal-section warning-section">
          <h3>Caution</h3>
          <p>${pattern.caution}</p>
        </div>
      ` : ''}
    `;

    modal.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  // ========================================
  // Quiz Module
  // ========================================

  renderQuiz(container) {
    if (!this.quiz || !this.quiz.questions) {
      container.innerHTML = '<div class="empty-state"><h3>Quiz not available</h3></div>';
      return;
    }

    // Filter questions based on selection
    this.filterQuizQuestions();

    const categories = this.quiz.categories || [];
    const totalQuestions = this.quizState.filteredQuestions.length;
    const answeredCount = Object.keys(this.quizState.answers).filter(
      id => this.quizState.filteredQuestions.find(q => q.id === id)
    ).length;

    // Calculate stats
    const correctCount = this.calculateCorrectAnswers();
    const percentage = answeredCount > 0 ? Math.round((correctCount / answeredCount) * 100) : 0;

    container.innerHTML = `
      <div class="view-header">
        <h2>Sales Training Quiz</h2>
        <p>Test your knowledge! Heavy focus on financing - the area reps need the most help.</p>
      </div>

      <div class="stats-bar">
        <div class="stat">
          <span class="stat-value">${totalQuestions}</span>
          <span class="stat-label">Questions Available</span>
        </div>
        <div class="stat">
          <span class="stat-value">${answeredCount}/${totalQuestions}</span>
          <span class="stat-label">Answered</span>
        </div>
        <div class="stat ${percentage >= 80 ? 'stat-success' : percentage >= 60 ? 'stat-warning' : 'stat-danger'}">
          <span class="stat-value">${percentage}%</span>
          <span class="stat-label">Score</span>
        </div>
        <div class="stat">
          <span class="stat-value">${correctCount}</span>
          <span class="stat-label">Correct</span>
        </div>
      </div>

      <div class="quiz-controls">
        <div class="quiz-filters">
          <div class="filter-group">
            <label>Category:</label>
            <select id="quiz-category-filter" class="quiz-filter-select">
              <option value="all" ${this.quizState.selectedCategory === 'all' ? 'selected' : ''}>All Categories</option>
              ${categories.map(cat => `
                <option value="${cat.id}" ${this.quizState.selectedCategory === cat.id ? 'selected' : ''}>
                  ${cat.name} (${this.quiz.questions.filter(q => q.category === cat.id).length})
                </option>
              `).join('')}
            </select>
          </div>
          <div class="filter-group">
            <label>Difficulty:</label>
            <select id="quiz-difficulty-filter" class="quiz-filter-select">
              <option value="all" ${this.quizState.selectedDifficulty === 'all' ? 'selected' : ''}>All Levels</option>
              <option value="easy" ${this.quizState.selectedDifficulty === 'easy' ? 'selected' : ''}>Easy</option>
              <option value="medium" ${this.quizState.selectedDifficulty === 'medium' ? 'selected' : ''}>Medium</option>
              <option value="hard" ${this.quizState.selectedDifficulty === 'hard' ? 'selected' : ''}>Hard</option>
            </select>
          </div>
        </div>
        <div class="quiz-actions">
          <button class="btn-secondary" onclick="app.resetQuiz()">Reset Progress</button>
          <button class="btn-secondary" onclick="app.shuffleQuiz()">Shuffle Questions</button>
          <button class="btn-primary" onclick="app.showQuizResults()">View Results</button>
        </div>
      </div>

      <div class="quiz-progress-bar">
        <div class="quiz-progress-fill" style="width: ${(answeredCount / totalQuestions) * 100}%"></div>
      </div>

      <div class="quiz-container" id="quiz-container">
        ${this.quizState.showingResults ? this.renderQuizResults() : this.renderQuizQuestion()}
      </div>

      <div class="quiz-category-overview">
        <h3>Category Breakdown</h3>
        <div class="category-cards">
          ${categories.map(cat => {
            const catQuestions = this.quiz.questions.filter(q => q.category === cat.id);
            const catAnswered = catQuestions.filter(q => this.quizState.answers[q.id] !== undefined).length;
            const catCorrect = catQuestions.filter(q => this.quizState.answers[q.id] === q.correct).length;
            const catPercent = catAnswered > 0 ? Math.round((catCorrect / catAnswered) * 100) : 0;
            return `
              <div class="category-stat-card ${this.quizState.selectedCategory === cat.id ? 'active' : ''}"
                   onclick="app.setQuizCategory('${cat.id}')">
                <h4>${cat.name}</h4>
                <p class="cat-desc">${cat.description}</p>
                <div class="cat-stats">
                  <span>${catAnswered}/${catQuestions.length} answered</span>
                  <span class="${catPercent >= 80 ? 'text-success' : catPercent >= 60 ? 'text-warning' : 'text-danger'}">${catPercent}% correct</span>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;

    this.bindQuizEvents();
  }

  filterQuizQuestions() {
    let questions = [...(this.quiz.questions || [])];

    if (this.quizState.selectedCategory !== 'all') {
      questions = questions.filter(q => q.category === this.quizState.selectedCategory);
    }

    if (this.quizState.selectedDifficulty !== 'all') {
      questions = questions.filter(q => q.difficulty === this.quizState.selectedDifficulty);
    }

    this.quizState.filteredQuestions = questions;

    // Reset index if out of bounds
    if (this.quizState.currentQuestionIndex >= questions.length) {
      this.quizState.currentQuestionIndex = 0;
    }
  }

  renderQuizQuestion() {
    const questions = this.quizState.filteredQuestions;
    if (questions.length === 0) {
      return `
        <div class="quiz-empty">
          <h3>No questions match your filters</h3>
          <p>Try selecting a different category or difficulty level.</p>
        </div>
      `;
    }

    const currentIndex = this.quizState.currentQuestionIndex;
    const question = questions[currentIndex];
    const answered = this.quizState.answers[question.id] !== undefined;
    const selectedAnswer = this.quizState.answers[question.id];
    const isCorrect = selectedAnswer === question.correct;
    const category = this.quiz.categories.find(c => c.id === question.category);

    return `
      <div class="quiz-question-card">
        <div class="quiz-question-header">
          <div class="quiz-question-meta">
            <span class="quiz-category-tag">${category?.name || question.category}</span>
            <span class="quiz-difficulty-tag ${question.difficulty}">${question.difficulty}</span>
          </div>
          <span class="quiz-question-number">Question ${currentIndex + 1} of ${questions.length}</span>
        </div>

        <h3 class="quiz-question-text">${question.question}</h3>

        <div class="quiz-options">
          ${question.options.map((option, index) => {
            let optionClass = 'quiz-option';
            if (answered) {
              if (index === question.correct) {
                optionClass += ' correct';
              } else if (index === selectedAnswer && !isCorrect) {
                optionClass += ' incorrect';
              }
            } else if (index === selectedAnswer) {
              optionClass += ' selected';
            }
            return `
              <button class="${optionClass}"
                      data-option-index="${index}"
                      ${answered ? 'disabled' : ''}>
                <span class="option-letter">${String.fromCharCode(65 + index)}</span>
                <span class="option-text">${option}</span>
                ${answered && index === question.correct ? '<span class="option-check">&#10003;</span>' : ''}
                ${answered && index === selectedAnswer && !isCorrect ? '<span class="option-x">&#10007;</span>' : ''}
              </button>
            `;
          }).join('')}
        </div>

        ${answered ? `
          <div class="quiz-explanation ${isCorrect ? 'correct' : 'incorrect'}">
            <div class="explanation-header">
              ${isCorrect ? '<span class="result-icon">&#10003;</span> Correct!' : '<span class="result-icon">&#10007;</span> Incorrect'}
            </div>
            <p>${question.explanation}</p>
          </div>
        ` : ''}

        <div class="quiz-navigation">
          <button class="btn-secondary" onclick="app.prevQuestion()" ${currentIndex === 0 ? 'disabled' : ''}>
            &larr; Previous
          </button>
          <div class="quiz-nav-dots">
            ${questions.slice(Math.max(0, currentIndex - 2), Math.min(questions.length, currentIndex + 3)).map((q, i) => {
              const actualIndex = Math.max(0, currentIndex - 2) + i;
              const isAnswered = this.quizState.answers[q.id] !== undefined;
              const wasCorrect = this.quizState.answers[q.id] === q.correct;
              let dotClass = 'nav-dot';
              if (actualIndex === currentIndex) dotClass += ' current';
              if (isAnswered) dotClass += wasCorrect ? ' correct' : ' incorrect';
              return `<button class="${dotClass}" onclick="app.goToQuestion(${actualIndex})">${actualIndex + 1}</button>`;
            }).join('')}
          </div>
          <button class="btn-secondary" onclick="app.nextQuestion()" ${currentIndex === questions.length - 1 ? 'disabled' : ''}>
            Next &rarr;
          </button>
        </div>
      </div>
    `;
  }

  renderQuizResults() {
    const questions = this.quizState.filteredQuestions;
    const answered = Object.keys(this.quizState.answers).filter(
      id => questions.find(q => q.id === id)
    );
    const correct = this.calculateCorrectAnswers();
    const percentage = answered.length > 0 ? Math.round((correct / answered.length) * 100) : 0;

    // Group results by category
    const categoryResults = {};
    this.quiz.categories.forEach(cat => {
      const catQuestions = questions.filter(q => q.category === cat.id);
      const catAnswered = catQuestions.filter(q => this.quizState.answers[q.id] !== undefined);
      const catCorrect = catQuestions.filter(q => this.quizState.answers[q.id] === q.correct);
      if (catQuestions.length > 0) {
        categoryResults[cat.id] = {
          name: cat.name,
          total: catQuestions.length,
          answered: catAnswered.length,
          correct: catCorrect.length,
          percentage: catAnswered.length > 0 ? Math.round((catCorrect.length / catAnswered.length) * 100) : 0
        };
      }
    });

    // Find weak areas (below 70%)
    const weakAreas = Object.values(categoryResults).filter(r => r.answered >= 3 && r.percentage < 70);

    return `
      <div class="quiz-results">
        <div class="results-header">
          <h2>Quiz Results</h2>
          <button class="btn-secondary" onclick="app.hideQuizResults()">Back to Quiz</button>
        </div>

        <div class="results-summary">
          <div class="results-score ${percentage >= 80 ? 'excellent' : percentage >= 60 ? 'good' : 'needs-work'}">
            <div class="score-circle">
              <span class="score-number">${percentage}%</span>
            </div>
            <div class="score-label">
              ${percentage >= 80 ? 'Excellent!' : percentage >= 60 ? 'Good Progress!' : 'Keep Practicing!'}
            </div>
          </div>
          <div class="results-stats">
            <div class="result-stat">
              <span class="stat-value">${correct}</span>
              <span class="stat-label">Correct</span>
            </div>
            <div class="result-stat">
              <span class="stat-value">${answered.length - correct}</span>
              <span class="stat-label">Incorrect</span>
            </div>
            <div class="result-stat">
              <span class="stat-value">${questions.length - answered.length}</span>
              <span class="stat-label">Unanswered</span>
            </div>
          </div>
        </div>

        ${weakAreas.length > 0 ? `
          <div class="weak-areas">
            <h3>Areas to Focus On</h3>
            <div class="weak-area-list">
              ${weakAreas.map(area => `
                <div class="weak-area-item" onclick="app.setQuizCategory('${Object.keys(categoryResults).find(k => categoryResults[k] === area)}'); app.hideQuizResults();">
                  <span class="weak-area-name">${area.name}</span>
                  <span class="weak-area-score">${area.percentage}%</span>
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}

        <div class="category-results">
          <h3>Results by Category</h3>
          <div class="category-result-grid">
            ${Object.entries(categoryResults).map(([id, result]) => `
              <div class="category-result-card">
                <h4>${result.name}</h4>
                <div class="result-bar-container">
                  <div class="result-bar ${result.percentage >= 80 ? 'excellent' : result.percentage >= 60 ? 'good' : 'needs-work'}"
                       style="width: ${result.percentage}%"></div>
                </div>
                <div class="result-details">
                  <span>${result.correct}/${result.answered} correct</span>
                  <span class="${result.percentage >= 80 ? 'text-success' : result.percentage >= 60 ? 'text-warning' : 'text-danger'}">${result.percentage}%</span>
                </div>
              </div>
            `).join('')}
          </div>
        </div>

        <div class="missed-questions">
          <h3>Review Missed Questions</h3>
          <div class="missed-list">
            ${questions.filter(q => this.quizState.answers[q.id] !== undefined && this.quizState.answers[q.id] !== q.correct).map((q, i) => `
              <div class="missed-item" onclick="app.goToQuestionById('${q.id}'); app.hideQuizResults();">
                <span class="missed-number">${i + 1}</span>
                <span class="missed-question">${q.question}</span>
                <span class="missed-category">${this.quiz.categories.find(c => c.id === q.category)?.name || q.category}</span>
              </div>
            `).join('') || '<p class="no-missed">No missed questions yet - keep going!</p>'}
          </div>
        </div>
      </div>
    `;
  }

  bindQuizEvents() {
    // Category filter
    const categoryFilter = document.getElementById('quiz-category-filter');
    if (categoryFilter) {
      categoryFilter.addEventListener('change', (e) => {
        this.quizState.selectedCategory = e.target.value;
        this.quizState.currentQuestionIndex = 0;
        this.renderCurrentView();
      });
    }

    // Difficulty filter
    const difficultyFilter = document.getElementById('quiz-difficulty-filter');
    if (difficultyFilter) {
      difficultyFilter.addEventListener('change', (e) => {
        this.quizState.selectedDifficulty = e.target.value;
        this.quizState.currentQuestionIndex = 0;
        this.renderCurrentView();
      });
    }

    // Option buttons
    document.querySelectorAll('.quiz-option:not([disabled])').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const index = parseInt(btn.dataset.optionIndex);
        this.selectAnswer(index);
      });
    });
  }

  selectAnswer(optionIndex) {
    const question = this.quizState.filteredQuestions[this.quizState.currentQuestionIndex];
    if (!question || this.quizState.answers[question.id] !== undefined) return;

    this.quizState.answers[question.id] = optionIndex;
    this.updateQuizContainer();
  }

  updateQuizContainer() {
    const container = document.getElementById('quiz-container');
    if (container) {
      container.innerHTML = this.quizState.showingResults ? this.renderQuizResults() : this.renderQuizQuestion();
      this.bindQuizEvents();
    }
    // Also update stats
    this.renderCurrentView();
  }

  nextQuestion() {
    if (this.quizState.currentQuestionIndex < this.quizState.filteredQuestions.length - 1) {
      this.quizState.currentQuestionIndex++;
      this.updateQuizContainer();
    }
  }

  prevQuestion() {
    if (this.quizState.currentQuestionIndex > 0) {
      this.quizState.currentQuestionIndex--;
      this.updateQuizContainer();
    }
  }

  goToQuestion(index) {
    if (index >= 0 && index < this.quizState.filteredQuestions.length) {
      this.quizState.currentQuestionIndex = index;
      this.updateQuizContainer();
    }
  }

  goToQuestionById(questionId) {
    const index = this.quizState.filteredQuestions.findIndex(q => q.id === questionId);
    if (index !== -1) {
      this.quizState.currentQuestionIndex = index;
    }
  }

  calculateCorrectAnswers() {
    return this.quizState.filteredQuestions.filter(
      q => this.quizState.answers[q.id] === q.correct
    ).length;
  }

  resetQuiz() {
    if (confirm('Are you sure you want to reset all your quiz progress?')) {
      this.quizState.answers = {};
      this.quizState.currentQuestionIndex = 0;
      this.quizState.showingResults = false;
      this.renderCurrentView();
      this.showToast('Quiz progress reset');
    }
  }

  shuffleQuiz() {
    // Shuffle the filtered questions
    for (let i = this.quizState.filteredQuestions.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.quizState.filteredQuestions[i], this.quizState.filteredQuestions[j]] =
      [this.quizState.filteredQuestions[j], this.quizState.filteredQuestions[i]];
    }
    this.quizState.currentQuestionIndex = 0;
    this.renderCurrentView();
    this.showToast('Questions shuffled');
  }

  setQuizCategory(categoryId) {
    this.quizState.selectedCategory = categoryId;
    this.quizState.currentQuestionIndex = 0;
    this.quizState.showingResults = false;
    this.renderCurrentView();
  }

  showQuizResults() {
    this.quizState.showingResults = true;
    this.renderCurrentView();
  }

  hideQuizResults() {
    this.quizState.showingResults = false;
    this.renderCurrentView();
  }
}

// Initialize app
let app;
document.addEventListener('DOMContentLoaded', () => {
  app = new SalesCommandCenter();
  app.init();
});

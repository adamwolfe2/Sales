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
    this.jobSuperpowers = null;
    this.currentView = 'objections';
    this.searchIndex = [];
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
    const [objections, playbooks, testimonials, reps, jobSuperpowers] = await Promise.all([
      fetch('data/objections.json').then(r => r.json()),
      fetch('data/playbooks.json').then(r => r.json()),
      fetch('data/testimonials.json').then(r => r.json()),
      fetch('data/reps.json').then(r => r.json()),
      fetch('data/job-superpowers.json').then(r => r.json()).catch(() => null)
    ]);

    this.objections = objections;
    this.playbooks = playbooks;
    this.testimonials = testimonials;
    this.reps = reps;
    this.jobSuperpowers = jobSuperpowers;
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
      case 'prospects':
        this.renderProspectProfiles(content);
        break;
      case 'testimonials':
        this.renderTestimonials(content);
        break;
      case 'analyzer':
        this.renderAnalyzer(content);
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
      testimonial: results.filter(r => r.type === 'testimonial')
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

    container.innerHTML = `
      <div class="view-header">
        <h2>Success Story Library</h2>
        <p>Social proof ammunition for presentations. Search or filter by objection type.</p>
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

      <div class="category-filters">
        <button class="filter-btn active" data-objection-type="all">All Stories</button>
        ${Object.keys(byObjection).map(type => `
          <button class="filter-btn" data-objection-type="${type}">
            ${type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
          </button>
        `).join('')}
      </div>

      <div class="testimonials-grid" id="testimonials-grid">
        ${fullTestimonials.map(test => this.renderTestimonialCard(test)).join('')}
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
    this.bindResultEvents();
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
      </div>
    `;
  }

  analyzeCall() {
    const textarea = document.getElementById('analyzer-objections');
    const resultsDiv = document.getElementById('analyzer-results');

    if (!textarea || !resultsDiv) return;

    const input = textarea.value.trim();
    if (!input) {
      resultsDiv.innerHTML = '<p class="empty-state">Enter at least one objection to analyze.</p>';
      return;
    }

    const lines = input.split('\n').filter(l => l.trim());
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

    const count = matchedObjections.length;
    const categories = [...new Set(matchedObjections.map(m => m.match.data.category))];

    // Three objection tip
    let tipAlert = '';
    if (count >= 3) {
      tipAlert = `
        <div class="analyzer-alert tip">
          <h4>Pro Tip: Multiple Objections</h4>
          <p><strong>Recommended:</strong> Re-qualify this prospect to find their main concern</p>
          <div class="script-block">
            <blockquote class="script">"On a scale of 1-10, how serious are you about starting a vending business in the next 90 days?"</blockquote>
            <button class="copy-btn" onclick="app.copyToClipboard('On a scale of 1-10, how serious are you about starting a vending business in the next 90 days?')">Copy</button>
          </div>
          <p><strong>If below 7:</strong> Ask what would make them a 9 or 10<br><strong>If 7+:</strong> "Let's identify the ONE thing really holding you back"</p>
        </div>
      `;
    }

    resultsDiv.innerHTML = `
      <div class="analyzer-summary">
        <h3>Analysis Results</h3>
        <div class="summary-stats">
          <div class="summary-stat">
            <span class="stat-value">${count}</span>
            <span class="stat-label">Objections Detected</span>
          </div>
          <div class="summary-stat">
            <span class="stat-value">${categories.length}</span>
            <span class="stat-label">Categories</span>
          </div>
        </div>
      </div>

      ${tipAlert}

      <div class="matched-objections">
        <h4>Matched Objections - Click for Scripts</h4>
        ${matchedObjections.map(m => `
          <div class="matched-item">
            <div class="matched-input">"${m.input}"</div>
            <div class="matched-result">
              <span class="matched-name">${m.match.data.name}</span>
              <span class="matched-category">${this.getCategoryName(m.match.data.category).replace(' Objections', '')}</span>
            </div>
            <button class="btn-small" onclick="app.showObjectionModal(app.objections.objections.find(o => o.id === '${m.match.id}'))">View Scripts</button>
          </div>
        `).join('')}
      </div>
    `;
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
}

// Initialize app
let app;
document.addEventListener('DOMContentLoaded', () => {
  app = new SalesCommandCenter();
  app.init();
});

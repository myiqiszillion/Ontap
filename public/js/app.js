/**
 * Main Application Controller
 * Handles flow: Home → Topics Selection → Study/Quiz/Flashcard/Practice
 */
const app = {
  currentSubject: null,
  currentGrade: 10,
  subjectsData: null,
  subjects: [],
  grades: [],
  selectedBais: [],
  lessonData: null,
  examMode: 'exam',
  quizDuration: 20,
  learningMode: 'exam',

  async init() {
    try {
      this.initTheme();
      this.subjectsData = await API.getSubjects();
      this.subjects = this.subjectsData.subjects || [];
      this.grades = this.subjectsData.grades || [10];
      
      this.currentGrade = this.grades[0]; // Default to first grade
      
      this.renderGradeTabs();
      this.renderSubjects();
      this.updateDashboardStats();
      this.setupEventListeners();
    } catch (error) {
      console.error('Failed to initialize:', error);
      alert('Không thể tải dữ liệu. Vui lòng refresh trang.');
    }
  },

  // ═══════════ THEME MANAGEMENT ═══════════

  initTheme() {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
      document.body.setAttribute('data-theme', savedTheme);
    } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      document.body.setAttribute('data-theme', 'dark');
    }
  },

  toggleTheme() {
    const isDark = document.body.getAttribute('data-theme') === 'dark';
    if (isDark) {
      document.body.removeAttribute('data-theme');
      localStorage.setItem('theme', 'light');
    } else {
      document.body.setAttribute('data-theme', 'dark');
      localStorage.setItem('theme', 'dark');
    }
  },

  // ═══════════ NAVIGATION TABS ═══════════

  switchMainTab(tab) {
    document.getElementById('tab-home').classList.remove('active');
    document.getElementById('tab-announcements').classList.remove('active');
    
    document.getElementById('view-home').style.display = 'none';
    document.getElementById('view-announcements').style.display = 'none';

    document.getElementById(`tab-${tab}`).classList.add('active');
    document.getElementById(`view-${tab}`).style.display = 'block';

    if (tab === 'announcements') {
      this.loadAnnouncements();
    }
  },

  async loadAnnouncements() {
    const container = document.getElementById('announcements-container');
    try {
      const res = await fetch('/api/announcements');
      if (!res.ok) throw new Error('API failed');
      const data = await res.json();
      
      if (!data || data.length === 0) {
        container.innerHTML = '<div style="text-align: center; color: var(--text-secondary); padding: 40px;">Chưa có thông báo nào.</div>';
        return;
      }

      container.innerHTML = data.map(ann => {
        const dateStr = new Date(ann.timestamp).toLocaleString('vi-VN', {
          hour: '2-digit', minute: '2-digit', 
          day: '2-digit', month: '2-digit', year: 'numeric'
        });
        
        let linkHtml = '';
        if (ann.link) {
          linkHtml = `<a href="${ann.link}" target="_blank" class="announcement-link">Xem chi tiết ↗</a>`;
        }

        let imageHtml = '';
        if (ann.image_url) {
          let urls = [];
          try {
              urls = JSON.parse(ann.image_url);
              if (!Array.isArray(urls)) urls = [ann.image_url];
          } catch (e) {
              urls = [ann.image_url];
          }

          if (urls.length === 1) {
              imageHtml = `
                <div class="announcement-image-container">
                  <img src="${urls[0]}" alt="${ann.title}" class="announcement-image single">
                </div>
              `;
          } else if (urls.length === 2) {
              imageHtml = `
                <div class="post-images-grid post-grid-2">
                  <img src="${urls[0]}" class="announcement-image">
                  <img src="${urls[1]}" class="announcement-image">
                </div>
              `;
          } else if (urls.length === 3) {
              imageHtml = `
                <div class="post-images-grid post-grid-3">
                  <img src="${urls[0]}" class="announcement-image">
                  <img src="${urls[1]}" class="announcement-image">
                  <img src="${urls[2]}" class="announcement-image">
                </div>
              `;
          } else if (urls.length >= 4) {
              imageHtml = `
                <div class="post-images-grid post-grid-4 post-grid-more">
                  <img src="${urls[0]}" class="announcement-image">
                  <img src="${urls[1]}" class="announcement-image">
                  <img src="${urls[2]}" class="announcement-image">
                  <div class="img-wrapper-last">
                      <img src="${urls[3]}" class="announcement-image">
                      ${urls.length > 4 ? `<div class="more-overlay">+${urls.length - 4}</div>` : ''}
                  </div>
                </div>
              `;
          }
        }

        return `
          <div class="announcement-card social-style">
            <div class="announcement-card-header" style="align-items: flex-start; gap: 12px; margin-bottom: 12px; display: flex;">
              <div class="announcement-avatar" style="background: transparent; padding: 0; margin-right: 0; flex-shrink: 0; width: 44px; height: 44px;">
                <img src="https://ui-avatars.com/api/?name=Lê+Văn+Nghĩa&background=0D8ABC&color=fff&rounded=true&bold=true" alt="Admin Avatar" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover; border: 2px solid var(--primary-color);">
              </div>
              <div class="announcement-meta-info" style="display: flex; flex-direction: column; justify-content: center; height: 44px;">
                <div class="announcement-author" style="font-weight: 700; font-size: 1rem; color: var(--text-primary); display: flex; align-items: center; gap: 4px; line-height: 1.2;">
                  Lê Văn Nghĩa 
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="#1d9bf0"><g><path d="M22.5 12.5c0-1.58-.875-2.95-2.148-3.6.154-.435.238-.905.238-1.4 0-2.21-1.71-3.998-3.918-3.998-.47 0-.92.084-1.336.25C14.818 2.415 13.51 1.5 12 1.5s-2.816.917-3.337 2.25c-.416-.165-.866-.25-1.336-.25-2.21 0-3.918 1.79-3.918 4 0 .495.084.965.238 1.4-1.273.65-2.148 2.02-2.148 3.6 0 1.46.74 2.748 1.873 3.45-.098.39-.153.8-.153 1.2 0 2.21 1.71 4 3.918 4 .58 0 1.134-.14 1.62-.387.595 1.09 1.69 1.838 2.946 1.838 1.258 0 2.355-.748 2.946-1.838.485.247 1.04.387 1.62.387 2.21 0 3.918-1.79 3.918-4 0-.4-.055-.81-.153-1.2 1.133-.7 1.873-1.99 1.873-3.45zm-11.233 5.48L5.75 12.55l2.42-2.31 3.097 3.24L17.763 6.94l2.43 2.22-8.926 8.82z"></path></g></svg>
                </div>
                <span class="announcement-time" style="font-size: 0.85rem; color: var(--text-muted); margin-top: 2px;">${dateStr}</span>
              </div>
            </div>
            
            <div class="announcement-card-body">
              <h3 class="announcement-title" style="margin-top: 0; margin-bottom: 10px; font-size: 1.1rem; color: var(--text-primary); line-height: 1.4;">${ann.title}</h3>
              <div class="announcement-content" style="line-height: 1.6;">${this.escapeHTML(ann.content)}</div>
              ${linkHtml}
            </div>

            ${imageHtml}
          </div>
        `;
      }).join('');
    } catch (e) {
      console.error(e);
      container.innerHTML = '<div style="text-align: center; color: var(--text-secondary); padding: 40px;">Lỗi tải thông báo.</div>';
    }
  },

  escapeHTML(str) {
    return str.replace(/[&<>'"]/g, 
      tag => ({
          '&': '&amp;',
          '<': '&lt;',
          '>': '&gt;',
          "'": '&#39;',
          '"': '&quot;'
        }[tag])
    );
  },

  // ═══════════ DASHBOARD & GRADES ═══════════

  updateDashboardStats() {
    const statSubjects = document.getElementById('total-subjects-stat');
    const statQuestions = document.getElementById('total-questions-stat');
    
    if (statSubjects) statSubjects.textContent = this.subjects.length;
    // Estimate total questions (mock calculation for demo, normally would aggregate from actual data)
    if (statQuestions) statQuestions.textContent = this.subjects.length * 150;
  },

  renderGradeTabs() {
    const container = document.getElementById('grade-tabs');
    if (!container) return;
    
    container.innerHTML = this.grades.map(grade => `
      <button class="grade-tab ${grade === this.currentGrade ? 'active' : ''}" 
              onclick="app.selectGrade(${grade})">
        Lớp ${grade}
      </button>
    `).join('');
  },

  selectGrade(grade) {
    this.currentGrade = grade;
    this.renderGradeTabs();
    this.renderSubjects();
  },

  renderSubjects() {
    const container = document.getElementById('subjects-grid');
    if (!container) return;

    // Filter by selected grade
    const filteredSubjects = this.subjects.filter(s => s.grade === this.currentGrade);

    if (filteredSubjects.length === 0) {
      container.innerHTML = `<div style="grid-column: 1/-1; text-align: center; padding: 40px; color: var(--text-muted);">Đang cập nhật môn học cho Lớp ${this.currentGrade}...</div>`;
      return;
    }

    const gradients = ['var(--grad-purple)', 'var(--grad-green)', 'var(--grad-blue)', 'var(--grad-orange)', 'var(--grad-red)'];

    container.innerHTML = filteredSubjects.map((subject, index) => {
      const gradient = gradients[index % gradients.length];
      const progress = this.getSubjectProgress(subject.id);
      
      return `
      <div class="subject-card" data-id="${subject.id}"
           onclick="app.selectSubject('${subject.id}')"
           style="--card-color: ${subject.color}">
        
        <div class="subject-card-header">
          <div class="subject-icon" style="background: ${gradient}; color: ${subject.color}">
            ${subject.icon}
          </div>
          <div class="subject-info">
            <div class="subject-name">${subject.name}</div>
            <div class="subject-desc">${subject.description}</div>
          </div>
        </div>

        <div class="subject-card-footer">
          <span class="subject-badge">Mới</span>
          <div class="subject-progress-container">
            <div class="subject-progress-bar-bg">
              <div class="subject-progress-fill" style="width: ${progress}%"></div>
            </div>
            <span>${progress}%</span>
          </div>
        </div>
      </div>
    `}).join('');
  },

  getSubjectProgress(subjectId) {
    // Basic mock progress calculation based on localStorage or default to 0
    const progress = localStorage.getItem(`progress_${subjectId}`);
    return progress ? parseInt(progress) : 0;
  },

  async selectSubject(subjectId) {
    this.currentSubject = subjectId;
    const subject = this.subjects.find(s => s.id === subjectId);
    document.getElementById('selected-subject-name').textContent = subject.name;

    try {
      this.lessonData = await DataLoader.getLessons(subjectId);
      this.renderTopics();
      this.updateWrongCount();
      this.showScreen('topics');
    } catch (error) {
      console.error('Failed to load lessons:', error);
      alert('Không thể tải danh sách bài học.');
    }
  },

  // ═══════════ MODE SELECTION ═══════════

  selectMode(mode) {
    this.learningMode = mode;
    document.querySelectorAll('.mode-card').forEach(c => c.classList.remove('selected'));
    document.querySelector(`.mode-card[data-mode="${mode}"]`).classList.add('selected');

    // Show/hide exam/practice config
    const examConfig = document.getElementById('quiz-config-exam');
    const pracConfig = document.getElementById('quiz-config-practice');
    const fcConfig = document.getElementById('quiz-config-flashcard');
    
    if (examConfig) examConfig.style.display = mode === 'exam' ? 'block' : 'none';
    if (pracConfig) pracConfig.style.display = ['study', 'flashcard', 'practice'].includes(mode) ? 'block' : 'none';
    if (fcConfig) fcConfig.style.display = ['study', 'flashcard'].includes(mode) ? 'block' : 'none';

    // Show/hide topic list for wrong mode
    const topicsList = document.getElementById('topics-list');
    const topicsHeader = document.querySelector('.topics-header');
    if (mode === 'wrong') {
      topicsList.style.display = 'none';
      topicsHeader.style.display = 'none';
    } else {
      topicsList.style.display = '';
      topicsHeader.style.display = '';
    }

    // Update start button text
    const startBtn = document.getElementById('start-btn');
    const labels = {
      exam: '📝 Bắt đầu thi',
      study: '📖 Bắt đầu học',
      flashcard: '🃏 Bắt đầu flashcard',
      practice: '💪 Bắt đầu luyện',
      wrong: '❌ Luyện câu sai'
    };
    startBtn.textContent = labels[mode] || '🚀 Bắt đầu';

    // Wrong mode doesn't need topic selection
    if (mode === 'wrong') {
      const wrongCount = WrongTracker.getWrongCount(this.currentSubject);
      startBtn.disabled = wrongCount === 0;
    } else {
      this.updateQuizSummary();
    }

    // Toggle Resume button visibility
    const resumeBtn = document.getElementById('resume-btn');
    if (resumeBtn) {
      if (mode === 'practice' && this.currentSubject) {
        const saved = localStorage.getItem(`ontap_practice_${this.currentSubject}`);
        if (saved) {
          resumeBtn.style.display = 'block';
        } else {
          resumeBtn.style.display = 'none';
        }
      } else {
        resumeBtn.style.display = 'none';
      }
    }
  },

  updateWrongCount() {
    if (this.currentSubject) {
      const count = WrongTracker.getWrongCount(this.currentSubject);
      const badge = document.getElementById('wrong-count-badge');
      if (badge) badge.textContent = count;
    }
  },

  // ═══════════ TOPIC RENDERING ═══════════

  renderTopics() {
    const container = document.getElementById('topics-list');

    container.innerHTML = this.lessonData.lessons.map(lesson => `
      <div class="topic-card" data-bai="${lesson.bai}">
        <label class="topic-checkbox-wrapper">
          <input type="checkbox"
                 class="topic-checkbox"
                 value="${lesson.bai}"
                 onchange="app.toggleBai(${lesson.bai})">
          <span class="topic-checkmark"></span>
        </label>
        <div class="topic-info" onclick="app.toggleBai(${lesson.bai}, true)">
          <div class="topic-title">${lesson.title}</div>
          <div class="topic-meta">
            <span class="topic-questions">${lesson.mcqCount} TN</span>
            <span class="topic-tf">${lesson.tfGroupCount} bài Đ/S</span>
            <span class="topic-time">~${lesson.estimatedTime} phút</span>
          </div>
        </div>
      </div>
    `).join('');

    this.selectedBais = [];
    this.updateQuizSummary();
  },

  toggleBai(bai, fromInfo = false) {
    const checkbox = document.querySelector(`input.topic-checkbox[value="${bai}"]`);
    const topicCard = checkbox.closest('.topic-card');

    if (fromInfo) checkbox.checked = !checkbox.checked;

    if (checkbox.checked) {
      if (!this.selectedBais.includes(bai)) this.selectedBais.push(bai);
      topicCard.classList.add('selected');
    } else {
      this.selectedBais = this.selectedBais.filter(b => b !== bai);
      topicCard.classList.remove('selected');
    }

    this.updateQuizSummary();
  },

  selectAll() {
    const allChecked = this.selectedBais.length === this.lessonData.lessons.length;
    document.querySelectorAll('.topic-checkbox').forEach(cb => cb.checked = !allChecked);
    if (allChecked) {
      this.selectedBais = [];
      document.querySelectorAll('.topic-card').forEach(c => c.classList.remove('selected'));
    } else {
      this.selectedBais = this.lessonData.lessons.map(l => l.bai);
      document.querySelectorAll('.topic-card').forEach(c => c.classList.add('selected'));
    }
    this.updateQuizSummary();
  },

  updateQuizSummary() {
    const startBtn = document.getElementById('start-btn');

    if (this.learningMode === 'wrong') return;

    // Determine which pool to check for visibility. If lessons selected, check those. 
    // If none selected, check the entire subject so we don't show irrelevant inputs globally.
    const pool = this.selectedBais.length > 0 
      ? this.lessonData.lessons.filter(l => this.selectedBais.includes(l.bai))
      : this.lessonData.lessons;

    const maxMcq = pool.reduce((s, l) => s + l.mcqCount, 0);
    const maxTfGroups = pool.reduce((s, l) => s + l.tfGroupCount, 0);
    const maxSa = pool.reduce((s, l) => s + (l.saCount || 0), 0);

    // Update Exam limit containers visibility
    const mcqContainer = document.getElementById('config-item-mcq');
    const tfContainer = document.getElementById('config-item-tf');
    const saContainer = document.getElementById('config-item-sa');

    if (mcqContainer) mcqContainer.style.display = maxMcq > 0 ? 'flex' : 'none';
    if (tfContainer) tfContainer.style.display = maxTfGroups > 0 ? 'flex' : 'none';
    if (saContainer) saContainer.style.display = maxSa > 0 ? 'flex' : 'none';

    // Update Practice toggle containers visibility
    const pracMcqToggle = document.getElementById('prac-mcq-toggle');
    const pracTfToggle = document.getElementById('prac-tf-toggle');
    const pracSaToggle = document.getElementById('prac-sa-toggle');

    if (pracMcqToggle) pracMcqToggle.parentElement.style.display = maxMcq > 0 ? 'flex' : 'none';
    if (pracTfToggle) pracTfToggle.parentElement.style.display = maxTfGroups > 0 ? 'flex' : 'none';
    if (pracSaToggle) pracSaToggle.parentElement.style.display = maxSa > 0 ? 'flex' : 'none';

    // Hide entire block if there is <= 1 active toggle
    const activeTogglesCount = (maxMcq > 0 ? 1 : 0) + (maxTfGroups > 0 ? 1 : 0) + (maxSa > 0 ? 1 : 0);
    const pracConfigParent = document.getElementById('quiz-config-practice');
    if (pracConfigParent) {
      if (['study', 'flashcard', 'practice'].includes(this.learningMode)) {
        pracConfigParent.style.display = activeTogglesCount > 1 ? 'block' : 'none';
      } else {
        pracConfigParent.style.display = 'none';
      }
    }

    if (this.selectedBais.length === 0) {
      startBtn.disabled = true;
      document.getElementById('summary-questions').textContent = '0';
      document.getElementById('summary-time').textContent = '0';
      
      const pracSummaryEl = document.getElementById('summary-questions-practice');
      if (pracSummaryEl) pracSummaryEl.textContent = '0 câu';
      
      return;
    }

    const totalTime = pool.reduce((s, l) => s + l.estimatedTime, 0);

    // Update max values for inputs
    const mcqInput = document.getElementById('exam-mcq-limit');
    const tfInput = document.getElementById('exam-tf-limit');
    const saInput = document.getElementById('exam-sa-limit');

    if (mcqInput) {
      mcqInput.setAttribute('max', maxMcq);
      const currentVal = parseInt(mcqInput.value) || 0;
      if (currentVal > maxMcq) mcqInput.value = maxMcq;
    }
    if (tfInput) {
      tfInput.setAttribute('max', maxTfGroups);
      const currentVal = parseInt(tfInput.value) || 0;
      if (currentVal > maxTfGroups) tfInput.value = maxTfGroups;
    }
    if (saInput) {
      saInput.setAttribute('max', maxSa);
      const currentVal = parseInt(saInput.value) || 0;
      if (currentVal > maxSa) saInput.value = maxSa;
    }

    // Determine values to display
    const showMcq = mcqInput && maxMcq > 0 ? (parseInt(mcqInput.value) || 0) : 0;
    const showTf = tfInput && maxTfGroups > 0 ? (parseInt(tfInput.value) || 0) : 0;
    const showSa = saInput && maxSa > 0 ? (parseInt(saInput.value) || 0) : 0;

    let summaryParts = [];
    if (showMcq > 0) summaryParts.push(`${showMcq} TN`);
    if (showTf > 0) summaryParts.push(`${showTf} Đ/S`);
    if (showSa > 0) summaryParts.push(`${showSa} TLN`);

    const summaryText = summaryParts.length > 0 ? summaryParts.join(' + ') : '0 câu';

    const pracSummaryText = [
      (pracMcqToggle && pracMcqToggle.checked && maxMcq > 0) ? `${maxMcq} TN` : null,
      (pracTfToggle && pracTfToggle.checked && maxTfGroups > 0) ? `${maxTfGroups} Đ/S` : null,
      (pracSaToggle && pracSaToggle.checked && maxSa > 0) ? `${maxSa} TLN` : null
    ].filter(Boolean).join(' + ') || '0 câu';

    document.getElementById('summary-questions').textContent = summaryText;
    document.getElementById('summary-time').textContent = totalTime;
    
    const pracSummaryEl = document.getElementById('summary-questions-practice');
    if (pracSummaryEl) pracSummaryEl.textContent = pracSummaryText;
    
    // Enable start button if at least 1 question is selected
    if (this.learningMode === 'exam') {
        startBtn.disabled = (showMcq === 0 && showTf === 0 && showSa === 0);
    } else {
        startBtn.disabled = pracSummaryText === '0 câu';
    }
  },

  // ═══════════ EVENT LISTENERS ═══════════

  setupEventListeners() {
    // Attach events to dynamic inputs to recompute summary on change
    ['exam-mcq-limit', 'exam-tf-limit', 'exam-sa-limit', 'prac-mcq-toggle', 'prac-tf-toggle', 'prac-sa-toggle'].forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.addEventListener('change', () => this.updateQuizSummary());
        el.addEventListener('input', () => this.updateQuizSummary());
      }
    });

    document.getElementById('quiz-duration').addEventListener('change', (e) => {
      this.quizDuration = parseInt(e.target.value);
    });

    document.getElementById('start-btn').addEventListener('click', () => {
      this.startLearning();
    });
    
    const resumeBtn = document.getElementById('resume-btn');
    if (resumeBtn) {
      resumeBtn.addEventListener('click', () => {
        this.resumePractice();
      });
    }
  },

  // ═══════════ START LEARNING ═══════════

  async resumePractice() {
    if (!this.currentSubject) return;
    const saved = localStorage.getItem(`ontap_practice_${this.currentSubject}`);
    if (!saved) return;
    
    try {
      const state = JSON.parse(saved);
      // Giúp đồng bộ hoá tiến trình lưu với kho dữ liệu mới nhất nếu có sửa lỗi đề
      const latestData = await API.getQuestions(this.currentSubject);
      let allLatestQs = [];
      latestData.lessons.forEach(l => {
          if (l.type === 'truefalse' && l.questionGroups) allLatestQs.push(...l.questionGroups);
          else if (l.questions) allLatestQs.push(...l.questions);
      });

      state.questions = state.questions.map(q => {
          if (q.type === 'tf-group' || q.passage) {
              const updated = allLatestQs.find(newQ => newQ.passage === q.passage);
              if (updated) q.statements = updated.statements;
          } else {
              const updated = allLatestQs.find(newQ => newQ.question === q.question);
              if (updated) {
                  if (updated.options) q.options = updated.options;
                  q.correctAnswer = updated.correctAnswer !== undefined ? updated.correctAnswer : updated.correct;
              }
          }
          return q;
      });

      localStorage.setItem(`ontap_practice_${this.currentSubject}`, JSON.stringify(state));
    } catch (e) {
      console.error("Resume update error:", e);
    }

    this.showScreen('practice');
    Study.init({ subject: this.currentSubject, questions: [] }, 'practice', { resume: true });
  },

  async startLearning() {
    if (!this.currentSubject) return;

    // Wrong mode — load from localStorage
    if (this.learningMode === 'wrong') {
      const wrongQs = WrongTracker.getWrong(this.currentSubject);
      if (wrongQs.length === 0) {
        alert('Chưa có câu sai nào!');
        return;
      }
      const data = { subject: this.currentSubject, questions: wrongQs };
      this.showScreen('practice');
      Study.init(data, 'practice');
      return;
    }

    if (this.selectedBais.length === 0) return;

    try {
      let mcqLimit = null, tfLimit = null, saLimit = null;

      if (this.learningMode === 'exam') {
        const mcqInput = document.getElementById('exam-mcq-limit');
        const tfInput = document.getElementById('exam-tf-limit');
        const saInput = document.getElementById('exam-sa-limit');

        mcqLimit = mcqInput ? (parseInt(mcqInput.value) || 0) : null;
        tfLimit = tfInput ? (parseInt(tfInput.value) || 0) : null;
        saLimit = saInput ? (parseInt(saInput.value) || 0) : null;
      } else {
        const mcqCheck = document.getElementById('prac-mcq-toggle');
        const tfCheck = document.getElementById('prac-tf-toggle');
        const saCheck = document.getElementById('prac-sa-toggle');
        
        mcqLimit = (mcqCheck && mcqCheck.checked) ? null : 0;
        tfLimit = (tfCheck && tfCheck.checked) ? null : 0;
        saLimit = (saCheck && saCheck.checked) ? null : 0;
      }

      const quizData = await DataLoader.loadQuizData(
        this.currentSubject,
        this.selectedBais,
        this.learningMode, // Use actual learningMode instead of hardcoded 'exam'
        mcqLimit,
        tfLimit,
        saLimit
      );

      if (quizData.questions.length === 0) {
        alert('Không có câu hỏi nào phù hợp.');
        return;
      }

      const subject = this.subjects.find(s => s.id === this.currentSubject);

      if (this.learningMode === 'exam') {
        this.showScreen('quiz');
        document.getElementById('quiz-subject').textContent = subject.name;
        Quiz.init(quizData);

        if (this.quizDuration > 0) {
          Timer.init(this.quizDuration, (display, remaining) => {
            const timerEl = document.getElementById('active-timer');
            const timerDisplay = document.getElementById('active-timer-display');
            timerDisplay.textContent = display;
            timerEl.classList.remove('warning', 'danger');
            if (remaining <= 60) timerEl.classList.add('danger');
            else if (remaining <= 300) timerEl.classList.add('warning');
          }, () => {
            alert('Hết giờ! Bài thi sẽ được nộp tự động.');
            Quiz.submit();
          });
        } else {
          document.getElementById('active-timer-display').textContent = '∞';
        }
      } else if (this.learningMode === 'study') {
        const chunkSizeCheck = document.getElementById('fc-chunk-size');
        const chunkSize = chunkSizeCheck && chunkSizeCheck.value > 0 ? parseInt(chunkSizeCheck.value) : 0;

        this.showScreen('study');
        Study.init(quizData, 'study', { chunkSize });
      } else if (this.learningMode === 'flashcard') {
        const chunkSizeCheck = document.getElementById('fc-chunk-size');
        const chunkSize = chunkSizeCheck && chunkSizeCheck.value > 0 ? parseInt(chunkSizeCheck.value) : 0;

        this.showScreen('flashcard');
        Study.init(quizData, 'flashcard', { chunkSize });
      } else if (this.learningMode === 'practice') {
        this.showScreen('practice');
        Study.init(quizData, 'practice');
      }
    } catch (error) {
      console.error('Failed to start:', error);
      alert('Không thể tải câu hỏi. Vui lòng thử lại.');
    }
  },

  // Previous startQuiz for backward compatibility
  startQuiz() { this.learningMode = 'exam'; this.startLearning(); },

  // ═══════════ RESULTS ═══════════

  showResults(correct, total) {
    Timer.stop();

    const percentage = Math.round((correct / total) * 100);

    document.getElementById('score-value').textContent = correct;
    document.getElementById('score-total').textContent = total;
    document.getElementById('correct-count').textContent = correct;
    document.getElementById('wrong-count').textContent = total - correct;
    document.getElementById('time-used').textContent = Timer.formatTime(Timer.getTimeUsed());

    const circumference = 2 * Math.PI * 45;
    const offset = circumference - (percentage / 100) * circumference;
    const ring = document.getElementById('score-ring');
    ring.style.strokeDashoffset = circumference;
    requestAnimationFrame(() => {
      requestAnimationFrame(() => { ring.style.strokeDashoffset = offset; });
    });

    let message = '';
    if (percentage >= 90) message = 'Xuất sắc! Bạn nắm vững kiến thức!';
    else if (percentage >= 70) message = 'Tốt lắm! Tiếp tục phát huy nhé!';
    else if (percentage >= 50) message = 'Khá tốt! Ôn thêm để đạt điểm cao hơn';
    else message = 'Cần ôn tập thêm! Đừng nản nhé!';

    document.getElementById('result-message').textContent = message;
    this.showScreen('result');
  },

  // ═══════════ NAVIGATION ═══════════

  exitStudy() {
    if (confirm('Thoát chế độ học?')) {
      this.goHome();
    }
  },

  goHome() {
    Timer.clearState();
    Timer.stop();
    this.currentSubject = null;
    this.selectedBais = [];
    this.lessonData = null;
    this.learningMode = 'exam';

    document.querySelectorAll('.topic-card').forEach(c => {
      c.classList.remove('selected');
      const cb = c.querySelector('input');
      if (cb) cb.checked = false;
    });
    document.querySelectorAll('.subject-card').forEach(c => c.classList.remove('selected'));

    this.showScreen('home');
  },

  goBackToHome() { this.goHome(); },

  quitQuiz() {
    if (confirm('Thoát khỏi bài thi? Tiến trình sẽ bị mất.')) {
      Timer.clearState();
      Timer.stop();
      this.goHome();
    }
  },

  showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('on'));
    document.getElementById(`screen-${screenId}`).classList.add('on');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
};

// Start app
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => app.init());
} else {
  app.init();
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = app;
}

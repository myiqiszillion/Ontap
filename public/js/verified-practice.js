(() => {
  const get = id => document.getElementById(id), key = 'ntmk_verified_session';
  let session = null, busy = false;

  // Finding B1: Preselect grade based on student profile instead of arbitrarily defaulting to 10
  function preselectStudentGrade() {
    try {
      const raw = localStorage.getItem('ntmk_student_profile') || localStorage.getItem('ntmk_profile');
      if (raw) {
        const profile = JSON.parse(raw);
        const studentGrade = profile.grade || profile.currentGrade;
        const gradeSelect = get('grade');
        if (gradeSelect && studentGrade && [10, 11, 12].includes(Number(studentGrade))) {
          gradeSelect.value = String(studentGrade);
        }
      }
    } catch (err) {
      // Graceful fallback to default
    }
  }
  preselectStudentGrade();

  try {
    session = JSON.parse(sessionStorage.getItem(key));
  } catch {
    sessionStorage.removeItem(key);
  }

  const persist = () => sessionStorage.setItem(key, JSON.stringify(session));

  async function request(action, body) {
    const controller = new AbortController(), timeout = setTimeout(() => controller.abort(), 10000);
    try {
      const response = await fetch('/api/v2/questions?action=' + action, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Yêu cầu thất bại');
      return data;
    } finally {
      clearTimeout(timeout);
    }
  }

  function render() {
    get('questions').replaceChildren();
    get('submit').hidden = !session;
    get('start').disabled = Boolean(session && !session.result);

    if (!session) {
      if (get('result')) get('result').hidden = true;
      return;
    }

    if (session.result) {
      get('result').textContent = JSON.stringify(session.result, null, 2);
      get('result').hidden = false;
      get('submit').hidden = true;
      return;
    }

    if (get('result')) get('result').hidden = true;

    for (const [i, q] of session.questions.entries()) {
      const article = document.createElement('article');
      const title = document.createElement('p');
      title.textContent = `Câu ${i + 1}: ${q.prompt}`;
      article.append(title);

      const set = value => {
        session.answers[q.id] = value;
        persist();
      };

      if (q.mcqPayload) {
        for (const [j, option] of q.mcqPayload.options.entries()) {
          const label = document.createElement('label');
          const input = document.createElement('input');
          input.type = 'radio';
          input.name = q.id;
          input.checked = session.answers[q.id] === j;
          input.onchange = () => set(j);
          label.append(input, document.createTextNode(option));
          article.append(label);
        }
      }

      if (q.tfPayload) {
        for (const [j, statement] of q.tfPayload.statements.entries()) {
          const label = document.createElement('label');
          label.append(document.createTextNode(statement.statement));
          const select = document.createElement('select');
          for (const [value, text] of [['', 'Chưa trả lời'], ['true', 'Đúng'], ['false', 'Sai']]) {
            const option = document.createElement('option');
            option.value = value;
            option.textContent = text;
            select.append(option);
          }
          select.value = session.answers[q.id]?.[j] === undefined ? '' : String(session.answers[q.id][j]);
          select.onchange = () => {
            const a = { ...(session.answers[q.id] || {}) };
            if (select.value === '') delete a[j];
            else a[j] = select.value === 'true';
            set(a);
          };
          label.append(select);
          article.append(label);
        }
      }

      if (q.shortAnswerPayload) {
        const input = document.createElement('input');
        input.type = 'text';
        input.setAttribute('aria-label', `Câu trả lời ${i + 1}`);
        input.placeholder = 'Nhập câu trả lời ngắn...';
        input.value = session.answers[q.id] || '';
        input.oninput = () => set(input.value);
        article.append(input);
      }

      get('questions').append(article);
    }
  }

  get('start').onclick = async () => {
    if (busy) return;
    busy = true;
    get('start').disabled = true;
    try {
      session = {
        ...await request('start', {
          subjectId: get('subject').value,
          grade: Number(get('grade').value)
        }),
        answers: {}
      };
      persist();
      render();
      get('status').textContent = session.shortages && session.shortages.length
        ? 'Bài luyện rút gọn: Ngân hàng đang cập nhật thêm câu hỏi thẩm định cho ma trận đề này.'
        : 'Đề thi đã tải thành công theo chuẩn cấu trúc GDPT 2018 (QĐ 764/QĐ-BGDĐT).';
    } catch (e) {
      get('status').textContent = e.message;
      get('start').disabled = false;
    } finally {
      busy = false;
    }
  };

  get('submit').onclick = async () => {
    if (busy || !session || session.result) return;
    busy = true;
    get('submit').disabled = true;
    try {
      session.result = await request('submit', {
        sessionId: session.sessionId,
        token: session.token,
        userAnswers: session.answers
      });
      persist();
      render();
      get('status').textContent = 'Bài thi đã được ghi nhận và chấm điểm tự động thành công!';
    } catch (e) {
      get('status').textContent = 'Chưa xác nhận nộp bài: ' + e.message + '. Bạn có thể thử lại; câu trả lời được giữ an toàn trên thiết bị.';
    } finally {
      busy = false;
      get('submit').disabled = false;
    }
  };

  setInterval(() => {
    if (session && !session.result) {
      const seconds = Math.max(0, Math.ceil((session.expiresAt - Date.now()) / 1000));
      get('remaining').textContent = 'Thời gian còn lại: ' + seconds + ' giây';
      if (!seconds) get('status').textContent = 'Phiên thi đã hết thời gian quy định.';
    }
  }, 1000);

  render();
})();

/**
 * TASK NEXUS - Warm Tech Minimalist Kanban Board
 * 3-Column Architecture: To-do, Process, Done
 * Native HTML5 Drag & Drop, Assignee Management, Category Filtering & LocalStorage
 */

(function () {
  'use strict';

  // Storage Key
  const STORAGE_KEY = 'nexus_warm_tech_todos_v1';

  // Status Definitions
  const STATUS_FLOW = ['todo', 'process', 'done'];

  // Priority Weights (High > Medium > Low)
  const PRIORITY_WEIGHTS = {
    high: 3,
    medium: 2,
    low: 1
  };

  const PRIORITY_CONFIG = {
    high: { label: 'HIGH', class: 'pri-high', icon: '▲' },
    medium: { label: 'MED', class: 'pri-medium', icon: '■' },
    low: { label: 'LOW', class: 'pri-low', icon: '▼' }
  };

  // Default seed data for first launch
  const DEFAULT_TODOS = [
    {
      id: 'task-kanban-1',
      title: '系統核心架構設計與模組評估',
      assignee: 'Alex',
      category: 'work',
      priority: 'high',
      status: 'todo',
      createdAt: Date.now() - 3600000 * 3
    },
    {
      id: 'task-kanban-2',
      title: '暖色調 UI 介面與動效打磨',
      assignee: '本人',
      category: 'work',
      priority: 'high',
      status: 'process',
      createdAt: Date.now() - 3600000 * 2
    },
    {
      id: 'task-kanban-3',
      title: '採買人體工學椅與護眼暖光檯燈',
      assignee: '本人',
      category: 'life',
      priority: 'low',
      status: 'process',
      createdAt: Date.now() - 3600000
    },
    {
      id: 'task-kanban-4',
      title: '晨間技術日誌整理與回顧',
      assignee: '本人',
      category: 'work',
      priority: 'medium',
      status: 'done',
      createdAt: Date.now() - 3600000 * 5
    }
  ];

  // Application State
  let todos = [];
  let currentFilter = 'all'; // 'all' | 'work' | 'life'
  let draggedTaskId = null;

  // DOM Elements
  const todoForm = document.getElementById('todoForm');
  const taskTitleInput = document.getElementById('taskTitle');
  const taskAssigneeInput = document.getElementById('taskAssignee');
  const filterTabs = document.querySelectorAll('.filter-tab');
  const clearDoneBtn = document.getElementById('clearDoneBtn');

  // Column Lists
  const listTodo = document.getElementById('listTodo');
  const listProcess = document.getElementById('listProcess');
  const listDone = document.getElementById('listDone');
  const columnLists = [listTodo, listProcess, listDone];

  // Badges & Counters
  const todoCountEl = document.getElementById('todoCount');
  const processCountEl = document.getElementById('processCount');
  const doneCountEl = document.getElementById('doneCount');
  const progressPercentEl = document.getElementById('progressPercent');
  const progressBarEl = document.getElementById('progressBar');

  const colBadgeTodo = document.getElementById('colBadgeTodo');
  const colBadgeProcess = document.getElementById('colBadgeProcess');
  const colBadgeDone = document.getElementById('colBadgeDone');

  const badgeAllEl = document.getElementById('badgeAll');
  const badgeWorkEl = document.getElementById('badgeWork');
  const badgeLifeEl = document.getElementById('badgeLife');
  const currentDateEl = document.getElementById('currentDate');

  /**
   * Escape HTML to prevent XSS injection
   */
  function escapeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str || '';
    return div.innerHTML;
  }

  /**
   * Live Digital Clock Display
   */
  function updateTimeDisplay() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');

    if (currentDateEl) {
      currentDateEl.textContent = `${year}.${month}.${day} // ${hours}:${minutes}`;
    }
  }

  /**
   * Load data from localStorage (with backwards-compatibility migration)
   */
  function loadTodos() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const rawTodos = JSON.parse(stored);
        todos = rawTodos.map(item => {
          let updated = { ...item };
          // If legacy item has completed boolean instead of status
          if (!updated.status) {
            updated.status = updated.completed ? 'done' : 'todo';
          }
          // If legacy item has no priority, default to 'medium'
          if (!updated.priority) {
            updated.priority = 'medium';
          }
          return updated;
        });
      } else {
        todos = DEFAULT_TODOS;
        saveTodos();
      }
    } catch (e) {
      console.warn('Failed to load from localStorage:', e);
      todos = DEFAULT_TODOS;
    }
  }

  /**
   * Save data to localStorage
   */
  function saveTodos() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(todos));
    } catch (e) {
      console.error('Failed to save to localStorage:', e);
    }
  }

  /**
   * Update stats metrics & progress
   */
  function updateStats() {
    const total = todos.length;
    const todoItems = todos.filter(t => t.status === 'todo');
    const processItems = todos.filter(t => t.status === 'process');
    const doneItems = todos.filter(t => t.status === 'done');

    const todoCount = todoItems.length;
    const processCount = processItems.length;
    const doneCount = doneItems.length;
    const percent = total === 0 ? 0 : Math.round((doneCount / total) * 100);

    const workCount = todos.filter(t => t.category === 'work').length;
    const lifeCount = todos.filter(t => t.category === 'life').length;

    // Header stats
    todoCountEl.textContent = todoCount;
    processCountEl.textContent = processCount;
    doneCountEl.textContent = doneCount;
    progressPercentEl.textContent = `${percent}%`;
    progressBarEl.style.width = `${percent}%`;

    // Column badges
    colBadgeTodo.textContent = todoCount;
    colBadgeProcess.textContent = processCount;
    colBadgeDone.textContent = doneCount;

    // Filter badges
    badgeAllEl.textContent = total;
    badgeWorkEl.textContent = workCount;
    badgeLifeEl.textContent = lifeCount;

    // Clear Done button state
    clearDoneBtn.style.opacity = doneCount > 0 ? '1' : '0.4';
    clearDoneBtn.style.pointerEvents = doneCount > 0 ? 'auto' : 'none';
  }

  /**
   * Create HTML node for a task card
   */
  function createTaskCard(todo) {
    const card = document.createElement('li');
    card.className = 'todo-card';
    card.dataset.id = todo.id;
    card.setAttribute('draggable', 'true');

    const categoryLabel = todo.category === 'work' ? '工作' : '生活';
    const categoryClass = todo.category === 'work' ? 'cat-work' : 'cat-life';
    const assigneeName = todo.assignee || '本人';

    // Priority configuration
    const priInfo = PRIORITY_CONFIG[todo.priority] || PRIORITY_CONFIG.medium;

    // Quick move shift buttons
    let quickMoveButtons = '';
    if (todo.status === 'todo') {
      quickMoveButtons = `
        <button class="btn-move" data-move="process" title="移動至進行中 (Process)">→</button>
      `;
    } else if (todo.status === 'process') {
      quickMoveButtons = `
        <button class="btn-move" data-move="todo" title="移回待處理 (To-do)">←</button>
        <button class="btn-move" data-move="done" title="移動至已完成 (Done)">→</button>
      `;
    } else if (todo.status === 'done') {
      quickMoveButtons = `
        <button class="btn-move" data-move="process" title="移回進行中 (Process)">←</button>
      `;
    }

    card.innerHTML = `
      <div class="card-top">
        <div class="drag-grip" title="可按住拖曳至不同欄位">
          <span class="grip-icon">⋮⋮</span>
          <span class="grip-text">DRAG</span>
        </div>
        <button class="btn-card-delete" data-action="delete" title="刪除此任務">
          &times;
        </button>
      </div>

      <div class="card-title">${escapeHTML(todo.title)}</div>

      <div class="card-bottom">
        <div class="card-tags">
          <span class="priority-badge ${priInfo.class}" title="優先程度：${priInfo.label}">
            <span class="pri-icon">${priInfo.icon}</span> ${priInfo.label}
          </span>
          <span class="category-badge ${categoryClass}">
            ${categoryLabel}
          </span>
          <span class="assignee-badge" title="負責人">
            <span class="assignee-icon">👤</span>
            ${escapeHTML(assigneeName)}
          </span>
        </div>
        <div class="card-quick-move">
          ${quickMoveButtons}
        </div>
      </div>
    `;

    // Attach Drag Events to card
    card.addEventListener('dragstart', handleDragStart);
    card.addEventListener('dragend', handleDragEnd);

    return card;
  }

  /**
   * Render cards into their respective columns
   */
  function render() {
    updateStats();

    // Filter items based on active category filter
    const filteredTodos = todos.filter(todo => {
      if (currentFilter === 'work') return todo.category === 'work';
      if (currentFilter === 'life') return todo.category === 'life';
      return true;
    });

    // Sort items primarily by Priority (High > Medium > Low), secondarily by createdAt descending
    filteredTodos.sort((a, b) => {
      const weightA = PRIORITY_WEIGHTS[a.priority] || PRIORITY_WEIGHTS.medium;
      const weightB = PRIORITY_WEIGHTS[b.priority] || PRIORITY_WEIGHTS.medium;
      if (weightA !== weightB) {
        return weightB - weightA; // High (3) first, then Medium (2), then Low (1)
      }
      return (b.createdAt || 0) - (a.createdAt || 0);
    });

    // Clear lists
    listTodo.innerHTML = '';
    listProcess.innerHTML = '';
    listDone.innerHTML = '';

    const cols = {
      todo: { el: listTodo, count: 0 },
      process: { el: listProcess, count: 0 },
      done: { el: listDone, count: 0 }
    };

    filteredTodos.forEach(todo => {
      const targetCol = cols[todo.status] || cols.todo;
      const card = createTaskCard(todo);
      targetCol.el.appendChild(card);
      targetCol.count++;
    });

    // Render empty notice for columns with 0 items
    Object.keys(cols).forEach(status => {
      if (cols[status].count === 0) {
        const emptyNotice = document.createElement('div');
        emptyNotice.className = 'col-empty-notice';
        emptyNotice.innerHTML = `
          <span class="col-empty-icon">📂</span>
          <span>無符合項目</span>
        `;
        cols[status].el.appendChild(emptyNotice);
      }
    });
  }

  /**
   * Add a new todo item (always enters 'todo' column)
   */
  function handleAddTodo(e) {
    e.preventDefault();

    const title = taskTitleInput.value.trim();
    if (!title) {
      taskTitleInput.focus();
      return;
    }

    const assigneeInputVal = taskAssigneeInput.value.trim();
    const assignee = assigneeInputVal || '本人';

    const categoryRadio = document.querySelector('input[name="taskCategory"]:checked');
    const category = categoryRadio ? categoryRadio.value : 'work';

    const priorityRadio = document.querySelector('input[name="taskPriority"]:checked');
    const priority = priorityRadio ? priorityRadio.value : 'medium';

    const newTodo = {
      id: 'task-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
      title: title,
      assignee: assignee,
      category: category,
      priority: priority,
      status: 'todo',
      createdAt: Date.now()
    };

    todos.unshift(newTodo);
    saveTodos();
    render();

    // Reset inputs
    taskTitleInput.value = '';
    taskAssigneeInput.value = '';
    taskTitleInput.focus();
  }

  /**
   * Move task to a target status
   */
  function moveTaskStatus(taskId, targetStatus) {
    if (!STATUS_FLOW.includes(targetStatus)) return;
    const task = todos.find(t => t.id === taskId);
    if (task && task.status !== targetStatus) {
      task.status = targetStatus;
      saveTodos();
      render();
    }
  }

  /**
   * Delete task item
   */
  function deleteTask(id) {
    const cardEl = document.querySelector(`.todo-card[data-id="${id}"]`);
    if (cardEl) {
      cardEl.style.transition = 'all 0.22s ease';
      cardEl.style.opacity = '0';
      cardEl.style.transform = 'scale(0.8)';
      setTimeout(() => {
        todos = todos.filter(t => t.id !== id);
        saveTodos();
        render();
      }, 180);
    } else {
      todos = todos.filter(t => t.id !== id);
      saveTodos();
      render();
    }
  }

  /**
   * Clear all tasks in Done column
   */
  function clearDone() {
    const hasDone = todos.some(t => t.status === 'done');
    if (!hasDone) return;

    todos = todos.filter(t => t.status !== 'done');
    saveTodos();
    render();
  }

  /**
   * Category Filter Tab Click
   */
  function handleFilterClick(e) {
    const btn = e.target.closest('.filter-tab');
    if (!btn) return;

    filterTabs.forEach(tab => tab.classList.remove('active'));
    btn.classList.add('active');

    currentFilter = btn.dataset.filter;
    render();
  }

  /* ==========================================================================
     DRAG AND DROP HANDLERS (Native HTML5)
     ========================================================================== */

  function handleDragStart(e) {
    const card = e.target.closest('.todo-card');
    if (!card) return;

    draggedTaskId = card.dataset.id;
    e.dataTransfer.setData('text/plain', draggedTaskId);
    e.dataTransfer.effectAllowed = 'move';

    // Delay slight visual shift for cleaner dragging preview
    setTimeout(() => {
      card.classList.add('dragging');
    }, 0);
  }

  function handleDragEnd(e) {
    const card = e.target.closest('.todo-card');
    if (card) {
      card.classList.remove('dragging');
    }
    draggedTaskId = null;

    // Clear all drop target highlights
    columnLists.forEach(list => list.classList.remove('drag-over'));
  }

  function setupColumnDropZones() {
    columnLists.forEach(list => {
      // Prevent default to allow dropping
      list.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        list.classList.add('drag-over');
      });

      list.addEventListener('dragleave', (e) => {
        // Only remove if leaving the list container itself
        if (!list.contains(e.relatedTarget)) {
          list.classList.remove('drag-over');
        }
      });

      list.addEventListener('drop', (e) => {
        e.preventDefault();
        list.classList.remove('drag-over');

        const taskId = e.dataTransfer.getData('text/plain') || draggedTaskId;
        const targetStatus = list.dataset.status;

        if (taskId && targetStatus) {
          moveTaskStatus(taskId, targetStatus);
        }
      });
    });
  }

  /**
   * Delegate click events on Kanban Board (Delete and Quick Move)
   */
  function handleBoardClick(e) {
    // Delete action
    const deleteBtn = e.target.closest('[data-action="delete"]');
    if (deleteBtn) {
      const card = deleteBtn.closest('.todo-card');
      if (card && card.dataset.id) {
        deleteTask(card.dataset.id);
      }
      return;
    }

    // Quick move action
    const moveBtn = e.target.closest('[data-move]');
    if (moveBtn) {
      const card = moveBtn.closest('.todo-card');
      const targetStatus = moveBtn.dataset.move;
      if (card && card.dataset.id && targetStatus) {
        moveTaskStatus(card.dataset.id, targetStatus);
      }
    }
  }

  /**
   * Setup Event Listeners
   */
  function initEventListeners() {
    todoForm.addEventListener('submit', handleAddTodo);
    clearDoneBtn.addEventListener('click', clearDone);

    filterTabs.forEach(tab => {
      tab.addEventListener('click', handleFilterClick);
    });

    const kanbanBoard = document.querySelector('.kanban-board');
    if (kanbanBoard) {
      kanbanBoard.addEventListener('click', handleBoardClick);
    }

    setupColumnDropZones();
  }

  /**
   * App Initialization
   */
  function init() {
    updateTimeDisplay();
    setInterval(updateTimeDisplay, 60000);
    loadTodos();
    initEventListeners();
    render();
  }

  // Run on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

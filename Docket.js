document.addEventListener('DOMContentLoaded', () => {
    // Get DOM elements
    const taskInput = document.getElementById('taskInput');
    const taskPriority = document.getElementById('taskPriority');
    const dueDate = document.getElementById('dueDate');
    const taskCategory = document.getElementById('taskCategory');
    const isRecurring = document.getElementById('isRecurring');
    const recurringInterval = document.getElementById('recurringInterval');
    const addBtn = document.getElementById('addBtn');
    const taskList = document.getElementById('taskList');
    const totalTasks = document.getElementById('totalTasks');
    const completedTasks = document.getElementById('completedTasks');
    const clearCompletedBtn = document.getElementById('clearCompleted');
    const filterPriority = document.getElementById('filterPriority');
    const filterCategory = document.getElementById('filterCategory');

    let tasks = JSON.parse(localStorage.getItem('tasks')) || [];

    // Enable/disable recurring interval select based on checkbox
    isRecurring.addEventListener('change', () => {
        recurringInterval.disabled = !isRecurring.checked;
    });

    function saveTasks() {
        localStorage.setItem('tasks', JSON.stringify(tasks));
        updateStats();
    }

    function updateStats() {
        totalTasks.textContent = `Total: ${tasks.length}`;
        const completed = tasks.filter(task => task.completed).length;
        completedTasks.textContent = `Completed: ${completed}`;
    }

    function createTaskElement(taskObj) {
        const li = document.createElement('li');
        li.className = `task-item ${taskObj.completed ? 'checked' : ''} priority-${taskObj.priority}`;
        
        const dueDateTime = taskObj.dueDate ? new Date(taskObj.dueDate) : null;
        const isOverdue = dueDateTime && dueDateTime < new Date() && !taskObj.completed;
        
        li.innerHTML = `
            <div class="task-header">
                <span class="task-text">${taskObj.text}</span>
                ${taskObj.category ? `<span class="category-tag">${taskObj.category}</span>` : ''}
                ${isOverdue ? '<span class="overdue-tag">Overdue</span>' : ''}
            </div>
            <div class="task-details">
                ${taskObj.dueDate ? `<span class="due-date">Due: ${new Date(taskObj.dueDate).toLocaleDateString()}</span>` : ''}
                ${taskObj.recurring ? `<span class="recurring-tag">Recurring: ${taskObj.recurringInterval}</span>` : ''}
            </div>
            ${taskObj.subtasks.length > 0 ? `
                <ul class="subtasks">
                    ${taskObj.subtasks.map(subtask => `
                        <li class="${subtask.completed ? 'checked' : ''}">
                            <input type="checkbox" ${subtask.completed ? 'checked' : ''} 
                                onclick="event.stopPropagation(); toggleSubtask(${taskObj.id}, ${subtask.id})">
                            <span>${subtask.text}</span>
                        </li>
                    `).join('')}
                </ul>
            ` : ''}
            <div class="actions">
                <button class="add-subtask-btn" onclick="event.stopPropagation(); addSubtask(${taskObj.id})">
                    <i class="fas fa-list"></i>
                </button>
                <button class="edit-btn"><i class="fas fa-edit"></i></button>
                <button class="delete-btn"><i class="fas fa-trash"></i></button>
            </div>
        `;

        li.querySelector('.task-text').addEventListener('click', () => toggleTask(taskObj.id));
        li.querySelector('.delete-btn').addEventListener('click', () => deleteTask(taskObj.id));
        li.querySelector('.edit-btn').addEventListener('click', () => editTask(taskObj.id));
        
        return li;
    }

    function renderTasks() {
        const filteredTasks = tasks.filter(task => {
            const priorityMatch = !filterPriority.value || task.priority === filterPriority.value;
            const categoryMatch = !filterCategory.value || task.category === filterCategory.value;
            return priorityMatch && categoryMatch;
        });

        taskList.innerHTML = '';
        filteredTasks.forEach(task => {
            taskList.appendChild(createTaskElement(task));
        });
        saveTasks();
        checkReminders();
    }

    function addTask(text) {
        if (text.trim()) {
            const newTask = {
                id: Date.now(),
                text: text.trim(),
                completed: false,
                priority: taskPriority.value,
                dueDate: dueDate.value,
                category: taskCategory.value,
                recurring: isRecurring.checked,
                recurringInterval: isRecurring.checked ? recurringInterval.value : null,
                subtasks: [],
                lastRecurrence: null
            };
            tasks.unshift(newTask);
            renderTasks();
            resetForm();
        }
    }

    function resetForm() {
        taskInput.value = '';
        taskPriority.value = 'low';
        dueDate.value = '';
        taskCategory.value = '';
        isRecurring.checked = false;
        recurringInterval.disabled = true;
        recurringInterval.value = 'daily';
    }

    function toggleTask(id) {
        const task = tasks.find(t => t.id === id);
        if (task) {
            task.completed = !task.completed;
            if (task.completed && task.recurring) {
                scheduleNextRecurrence(task);
            }
        }
        renderTasks();
    }

    function toggleSubtask(taskId, subtaskId) {
        const task = tasks.find(t => t.id === taskId);
        if (task) {
            const subtask = task.subtasks.find(s => s.id === subtaskId);
            if (subtask) {
                subtask.completed = !subtask.completed;
                renderTasks();
            }
        }
    }

    function addSubtask(taskId) {
        const task = tasks.find(t => t.id === taskId);
        if (task) {
            const subtaskText = prompt('Enter subtask:');
            if (subtaskText && subtaskText.trim()) {
                task.subtasks.push({
                    id: Date.now(),
                    text: subtaskText.trim(),
                    completed: false
                });
                renderTasks();
            }
        }
    }

    function scheduleNextRecurrence(task) {
        const currentDate = new Date(task.dueDate);
        let nextDate;

        switch (task.recurringInterval) {
            case 'daily':
                nextDate = new Date(currentDate.setDate(currentDate.getDate() + 1));
                break;
            case 'weekly':
                nextDate = new Date(currentDate.setDate(currentDate.getDate() + 7));
                break;
            case 'monthly':
                nextDate = new Date(currentDate.setMonth(currentDate.getMonth() + 1));
                break;
        }

        const newTask = {
            ...task,
            id: Date.now(),
            completed: false,
            dueDate: nextDate.toISOString().split('T')[0],
            lastRecurrence: new Date().toISOString()
        };

        tasks.unshift(newTask);
    }

    function checkReminders() {
        const now = new Date();
        tasks.forEach(task => {
            if (!task.completed && task.dueDate) {
                const dueDate = new Date(task.dueDate);
                const timeDiff = dueDate.getTime() - now.getTime();
                const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));

                if (daysDiff <= 1 && daysDiff >= 0 && !task.reminded) {
                    showReminder(task);
                    task.reminded = true;
                }
            }
        });
    }

    function showReminder(task) {
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('Task Reminder', {
                body: `Task "${task.text}" is due ${task.dueDate === new Date().toISOString().split('T')[0] ? 'today' : 'tomorrow'}!`
            });
        }
    }

    function deleteTask(id) {
        tasks = tasks.filter(task => task.id !== id);
        renderTasks();
    }

    function editTask(id) {
        const task = tasks.find(task => task.id === id);
        if (!task) return;

        const newText = prompt('Edit task:', task.text);
        if (newText !== null) {
            task.text = newText.trim();
            task.priority = prompt('Priority (low/medium/high):', task.priority) || task.priority;
            task.dueDate = prompt('Due date (YYYY-MM-DD):', task.dueDate) || task.dueDate;
            task.category = prompt('Category:', task.category) || task.category;
            renderTasks();
        }
    }

    function clearCompleted() {
        tasks = tasks.filter(task => !task.completed);
        renderTasks();
    }

    // Event Listeners
    addBtn.addEventListener('click', () => addTask(taskInput.value));
    
    taskInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') addTask(taskInput.value);
    });

    clearCompletedBtn.addEventListener('click', clearCompleted);

    filterPriority.addEventListener('change', renderTasks);
    filterCategory.addEventListener('change', renderTasks);

    // Request notification permission
    if ('Notification' in window) {
        Notification.requestPermission();
    }

    // Check for recurring tasks and reminders every minute
    setInterval(() => {
        tasks.forEach(task => {
            if (task.recurring && !task.completed && task.dueDate) {
                const dueDate = new Date(task.dueDate);
                const now = new Date();
                if (dueDate < now) {
                    scheduleNextRecurrence(task);
                    renderTasks();
                }
            }
        });
        checkReminders();
    }, 60000);

    // Initial render
    renderTasks();
});
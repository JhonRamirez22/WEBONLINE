import { TaskLinkedList, Task } from "./linkedList.js";

// Persistencia local: cada pestaña/navegador tiene su propia lista.
// No depende de ningún backend, por eso funciona directo en Vercel.
// TODO: si en el futuro se quiere sincronizar entre dispositivos, reemplazar
// `load`/`persist` por llamadas a una API (el backend Python del taller ya
// expone ese contrato en /api/tasks).
const STORAGE_KEY = "todo-linked-list:tasks:v1";

const tasks = new TaskLinkedList();
let nextId = 1;

const listEl = document.getElementById("task-list") as HTMLUListElement;
const formEl = document.getElementById("task-form") as HTMLFormElement;
const inputEl = document.getElementById("task-input") as HTMLInputElement;
const errorEl = document.getElementById("error") as HTMLParagraphElement;
const emptyEl = document.getElementById("empty-state") as HTMLParagraphElement;
const summaryEl = document.getElementById("summary") as HTMLParagraphElement;
const clearBtn = document.getElementById("clear-completed") as HTMLButtonElement;

function showError(message: string): void {
  errorEl.textContent = message;
  errorEl.hidden = false;
  window.setTimeout(() => (errorEl.hidden = true), 3000);
}

function persist(): void {
  const snapshot: Task[] = [];
  for (const node of tasks) {
    snapshot.push({ id: node.id, title: node.title, completed: node.completed });
  }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
  } catch {
    showError("No se pudo guardar (almacenamiento local no disponible)");
  }
}

function load(): void {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return;
  try {
    const parsed = JSON.parse(raw) as Task[];
    for (const task of parsed) {
      tasks.append(task);
      if (task.id >= nextId) nextId = task.id + 1;
    }
  } catch {
    showError("No se pudo leer el guardado anterior");
  }
}

function render(): void {
  listEl.innerHTML = "";
  let count = 0;

  for (const node of tasks) {
    count += 1;

    const li = document.createElement("li");
    li.className = "task" + (node.completed ? " task--done" : "");

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.className = "task__checkbox";
    checkbox.checked = node.completed;
    checkbox.setAttribute("aria-label", `Marcar "${node.title}" como completada`);
    checkbox.addEventListener("change", () => toggleTask(node.id));

    const label = document.createElement("span");
    label.className = "task__title";
    label.textContent = node.title;

    const deleteBtn = document.createElement("button");
    deleteBtn.type = "button";
    deleteBtn.className = "task__delete";
    deleteBtn.setAttribute("aria-label", `Eliminar "${node.title}"`);
    deleteBtn.textContent = "×";
    deleteBtn.addEventListener("click", () => deleteTask(node.id));

    li.append(checkbox, label, deleteBtn);
    listEl.appendChild(li);
  }

  emptyEl.hidden = count > 0;

  const completed = tasks.getCompletedCount();
  const pending = count - completed;
  summaryEl.hidden = count === 0;
  summaryEl.textContent = `${pending} pendiente${pending === 1 ? "" : "s"} · ${completed} completada${completed === 1 ? "" : "s"}`;
  clearBtn.hidden = completed === 0;
}

function addTask(title: string): void {
  try {
    tasks.append({ id: nextId, title, completed: false });
    nextId += 1;
    persist();
    render();
  } catch (err) {
    showError((err as Error).message);
  }
}

function toggleTask(id: number): void {
  const node = tasks.find(id);
  if (!node) return;
  node.completed = !node.completed;
  persist();
  render();
}

function deleteTask(id: number): void {
  if (tasks.remove(id)) {
    persist();
    render();
  }
}

formEl.addEventListener("submit", (event) => {
  event.preventDefault();
  const title = inputEl.value.trim();
  if (!title) return;
  if (title.length > 200) {
    showError("La tarea no puede superar 200 caracteres");
    return;
  }
  addTask(title);
  inputEl.value = "";
  inputEl.focus();
});

clearBtn.addEventListener("click", () => {
  if (tasks.clearCompleted() > 0) {
    persist();
    render();
  }
});

load();
render();

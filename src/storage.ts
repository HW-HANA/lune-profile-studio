import { create } from "zustand";
import { migrateProject } from "./theme";
import { initialProject, type Project } from "./model";
export interface SavedItem {
  id: string;
  title: string;
  created: number;
  project: Project;
  image?: string;
  format?: string;
}
let database: Promise<IDBDatabase> | undefined;
function db() {
  return (database ??= new Promise((resolve, reject) => {
    const request = indexedDB.open("lune-profile-studio", 1);
    request.onupgradeneeded = () => request.result.createObjectStore("data");
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  }));
}
export async function readData<T>(key: string): Promise<T | undefined> {
  const database = await db();
  return new Promise((resolve, reject) => {
    const request = database.transaction("data").objectStore("data").get(key);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
export async function writeData(key: string, value: unknown) {
  const database = await db();
  return new Promise<void>((resolve, reject) => {
    const tx = database.transaction("data", "readwrite");
    tx.objectStore("data").put(value, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}
interface State {
  project: Project;
  past: Project[];
  future: Project[];
  ready: boolean;
  saveStatus: string;
  change: (fn: (draft: Project) => void, key?: string) => void;
  replace: (project: Project) => void;
  undo: () => void;
  redo: () => void;
}
let lastKey = "",
  lastTime = 0,
  timer: ReturnType<typeof setTimeout>;
export const useStudio = create<State>((set, get) => ({
  project: initialProject(),
  past: [],
  future: [],
  ready: false,
  saveStatus: "正在载入",
  change: (fn, key = "") => {
    const state = get();
    if (!state.ready) return;
    const draft = structuredClone(state.project);
    fn(draft);
    const group = key && key === lastKey && Date.now() - lastTime < 800;
    lastKey = key;
    lastTime = Date.now();
    set({
      project: draft,
      past: group ? state.past : [...state.past.slice(-39), state.project],
      future: [],
    });
    save(draft);
  },
  replace: (project) => {
    lastKey = "";
    set((s) => ({
      project: migrateProject(structuredClone(project)),
      past: [...s.past.slice(-39), s.project],
      future: [],
    }));
    save(project);
  },
  undo: () => {
    const s = get();
    if (!s.past.length) return;
    lastKey = "";
    const project = s.past.at(-1)!;
    set({
      project,
      past: s.past.slice(0, -1),
      future: [s.project, ...s.future],
    });
    save(project);
  },
  redo: () => {
    const s = get();
    if (!s.future.length) return;
    lastKey = "";
    const project = s.future[0];
    set({ project, past: [...s.past, s.project], future: s.future.slice(1) });
    save(project);
  },
}));
function save(project: Project) {
  clearTimeout(timer);
  useStudio.setState({ saveStatus: "正在保存" });
  timer = setTimeout(() => {
    void writeData("draft", project)
      .then(() => useStudio.setState({ saveStatus: "已自动保存" }))
      .catch(() => useStudio.setState({ saveStatus: "保存失败，请备份项目" }));
  }, 350);
}
export async function hydrate() {
  try {
    const project = await readData<Project>("draft");
    if (project?.profile && project?.chat && project?.canvas)
      useStudio.setState({ project: migrateProject(project) });
    useStudio.setState({ ready: true, saveStatus: "已自动保存" });
  } catch {
    useStudio.setState({
      ready: true,
      saveStatus: "本地存储不可用，请备份项目",
    });
  }
}

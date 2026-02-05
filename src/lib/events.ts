type EventCallback = () => void;

class EventBus {
  private listeners: Map<string, Set<EventCallback>> = new Map();

  on(event: string, callback: EventCallback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
    return () => this.off(event, callback);
  }

  off(event: string, callback: EventCallback) {
    this.listeners.get(event)?.delete(callback);
  }

  emit(event: string) {
    this.listeners.get(event)?.forEach((cb) => cb());
  }
}

export const eventBus = new EventBus();

export const EVENTS = {
  NEW_TASK: "new-task",
  SEARCH: "search",
  TOGGLE_PREVIEW: "toggle-preview",
} as const;

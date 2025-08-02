interface CanvasStats {
  totalEdits: number;
  uniqueUsers: Set<string>;
}

class StatsStore {
  private stats: CanvasStats = {
    totalEdits: 0,
    uniqueUsers: new Set<string>()
  };

  addEdit(userId: string) {
    this.stats.totalEdits++;
    this.stats.uniqueUsers.add(userId);
  }

  getTotalEdits(): number {
    return this.stats.totalEdits;
  }

  getUniqueUserCount(): number {
    return this.stats.uniqueUsers.size;
  }

  getStats() {
    return {
      totalEdits: this.stats.totalEdits,
      uniqueUsers: this.stats.uniqueUsers.size
    };
  }
}

export const statsStore = new StatsStore();
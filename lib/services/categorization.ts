import { Transaction, Category, Rule } from '@/types';

export class CategorizationEngine {
  static defaultCategories: Category[] = [
    { id: 'transfer', name: 'Transfer', color: '#3B82F6', rules: [{ field: 'name', operator: '===', value: 'CRYPTOTRANSFER' }] },
    { id: 'token_transfer', name: 'Token Transfer', color: '#8B5CF6', rules: [{ field: 'token_transfers', operator: 'exists', value: true }] },
    { id: 'contract_call', name: 'Smart Contract', color: '#10B981', rules: [{ field: 'name', operator: '===', value: 'CONTRACTCALL' }] },
    { id: 'token_op', name: 'Token Operation', color: '#F59E0B', rules: [{ field: 'name', operator: 'includes', value: 'TOKEN' }] },
    { id: 'consensus', name: 'Consensus', color: '#EF4444', rules: [{ field: 'name', operator: 'includes', value: 'CONSENSUS' }] },
  ];

  static categorize(tx: Transaction, cats: Category[]): string {
    for (const cat of cats) {
      if (this.matches(tx, cat.rules)) return cat.id;
    }
    return 'other';
  }

  private static matches(tx: Transaction, rules: Rule[]): boolean {
    return rules.every(r => {
      const val = this.get(tx, r.field);
      switch (r.operator) {
        case '===': return val === r.value;
        case '>': return val > r.value;
        case '<': return val < r.value;
        case 'includes': return String(val).includes(r.value);
        case 'exists': return val !== undefined;
        default: return false;
      }
    });
  }

  private static get(obj: any, path: string): any {
    return path.split('.').reduce((o, k) => (o || {})[k], obj);
  }
}
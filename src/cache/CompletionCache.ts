import { SymbolType } from '../resource/enum/symbolTypes.js';
import { Trie } from './Trie.js';

/**
* One trie per SymbolType, stores the names of all symbols of a type into a trie datastructure
* This is used for quicker code completion lookups
*/
export class CompletionCache {
  private readonly cache: Map<SymbolType, Trie> = new Map();

  put(name: string, symbolType: SymbolType): void {
    if (!this.cache.has(symbolType)) {
      this.cache.set(symbolType, new Trie());
    }
    this.cache.get(symbolType)!.insert(name);
    const colonIndex = name.indexOf(':');
    if (colonIndex >= 0) {
      this.cache.get(symbolType)!.insert(name.substring(colonIndex + 1));
    }
  }

  getAllWithPrefix(prefix: string, symbolType: SymbolType): string[] | undefined {
    const symbolTrie = this.cache.get(symbolType);
    if (symbolTrie) {
      return symbolTrie.findAllWithPrefix(prefix);
    }
    return undefined;
  }

  contains(name: string, symbolType: SymbolType): boolean {
    const symbolTrie = this.cache.get(symbolType);
    if (symbolTrie) {
      return symbolTrie.hasWord(name);
    }
    return false;
  }

  remove(name: string, symbolType: SymbolType): void {
    const symbolTrie = this.cache.get(symbolType);
    if (symbolTrie) {
      symbolTrie.removeWord(name);
    }
  }

  clear(symbolType?: SymbolType): void {
    if (symbolType) {
      this.cache.delete(symbolType);
      return;
    }
    this.cache.clear();
  }

  getTypes(): SymbolType[] {
    return Array.from(this.cache.keys());
  }

  getTypesCount(): string[] {
    const labelWidth = 12;
    return this.getTypes()
      .sort((a, b) => this.cache.get(b)!.getAllWordsCount() - this.cache.get(a)!.getAllWordsCount())
      .map(type => {
        const label = `${type}:`.padEnd(labelWidth);
        return `  ${label} ${this.cache.get(type)!.getAllWordsCount()}`;
      });
  }
}

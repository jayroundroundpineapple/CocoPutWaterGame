// 并查集（Union-Find）：用于识别连通的相邻组
export class UnionFind {
    private parent: Map<number, number>; // key: correctIndex, value: 父节点correctIndex

    constructor(elements: number[]) {
        this.parent = new Map();
        elements.forEach(el => this.parent.set(el, el));
    }

    // 查找根节点（带路径压缩）
    find(x: number): number {
        if (this.parent.get(x) !== x) {
            this.parent.set(x, this.find(this.parent.get(x)!));
        }
        return this.parent.get(x)!;
    }

    // 合并两个节点
    union(x: number, y: number): void {
        const xRoot = this.find(x);
        const yRoot = this.find(y);
        if (xRoot !== yRoot) {
            this.parent.set(yRoot, xRoot);
        }
    }
}
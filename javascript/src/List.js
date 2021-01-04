export default class List {
  constructor() {
    this.head = null;
    this.tail = null;
  }

  shift(item) {
    item.prev = null;
    item.next = this.head;
    if (this.head === null) {
      this.tail = item;
    } else {
      this.head.prev = item;
    }
    this.head = item;
  }

  remove(item) {
    if (this.head === item) {
      this.head = item.next;
    }
    if (this.tail === item) {
      this.tail = item.prev;
    }
    if (item.prev) {
      item.prev.next = item.next;
    }
    if (item.next) {
      item.next.prev = item.prev;
    }
    item.next = null;
    item.prev = null;
  }

  pop() {
    let item = this.tail;
    if (item) {
      this.remove(item);
    }
    return item;
  }
}

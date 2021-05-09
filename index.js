class MyVue {
  constructor(options) {
    this.$options = options;
    this.$data = options.data;

    // 处理数据，对数据做劫持
    MyVue.observer(this.$data);

    // 代理数据
    this.proxy();

    // 编译模板
    new Compiler(options.el, this);
  }
  // 监听数据
  static observer(data) {
    // 这里可以做一些类型判断。不为基本类型
    if (typeof data !== "object" || data == null) {
      return;
    }
    new Observer(data);
  }
  proxy() {
    // 代理所有的属性到$data中
    for (const key in this.$data) {
      Object.defineProperty(this, key, {
        get() {
          return this.$data[key];
        },
        set(newVal) {
          this.$data[key] = newVal;
        },
      });
    }
  }
}
// 监听数据
class Observer {
  constructor(data) {
    // 循环遍历
    for (const key in data) {
      this.defineReactive(data, key, data[key]);
    }
  }
  defineReactive(obj, key, val) {
    MyVue.observer(val);
    // 创建一个Dep集合
    let dep = new Dep(); //当使用到这个值时，订阅。赋值时，统一发布
    Object.defineProperty(obj, key, {
      get() {
        Dep.target && dep.addDep(Dep.target); //如果有依赖，那么说明此时正在编译模板
        return val;
      },
      set(newVal) {
        if (val === newVal) {
          return;
        }
        // 数据很有可能成为一个新的对象
        MyVue.observer(newVal);
        val = newVal;
        // 这里数据被更新后，需要通知所有订阅者
        dep.notify(); //更新所有依赖中的所有wather
      },
    });
  }
}

// 编译模板
class Compiler {
  constructor(el, vm) {
    this.$vm = vm;
    console.log(el);
    console.log(document.querySelector(el));
    this.$el = document.querySelector(el);

    this.compile(this.$el);
  }
  compile(el) {
    el.childNodes.forEach((node) => {
      // node节点有很多。这里只对element元素节点1和text纯文本节点3
      if (node.nodeType === 1) {
        this.compileElement(node); //编译子节点
      } else if (node.nodeType === 3 && /\{\{(.*)\}\}/.test(node.textContent)) {
        this.compileText(node);
      }
      // 如果这个节点还有子节点，继续递归
      if (node.childNodes) {
        this.compile(node);
      }
    });
  }

  compileElement() {}

  compileText(node) {
    // 正则匹配后，可以取其中匹配的内容 RegExp.$1
    this.updateDOMDistrubute(node, RegExp.$1, this.textUpdate); //调用更新.将指令替换为数据值
  }

  updateDOMDistrubute(node, exp, updateFn) {
    updateFn(node, this.$vm[exp]); //手动第一次更新
    // 将这个模板的上使用的exp当做依赖收集起来
    new Watcher(this.$vm, exp, () => {
      updateFn(node, this.$vm[exp]);
    });
  }
  textUpdate(node, val) {
    node.textContent = val;
  }
}

// 管理一个依赖，可以执行对应的更新
class Watcher {
  constructor(vm, exp, updateFn) {
    this.$vm = vm;
    this.exp = exp;
    this.updateFn = updateFn; //挂载更新函数

    // 将这个watcher依赖放入Dep中管理
    Dep.target = this;
    vm[exp];
    Dep.target = null;
  }
  // 手动拉起更新函数，更新DOM
  update() {
    // 更新属性
    this.updateFn.call(this.$vm);
  }
}

// 依赖管理
class Dep {
  constructor() {
    this.deps = [];
  }
  addDep(watcher) {
    this.deps.push(watcher);
  }
  notify() {
    this.deps.forEach((watcher) => watcher.update()); //每个watcher上都有自己的update函数
  }
}
export default MyVue;

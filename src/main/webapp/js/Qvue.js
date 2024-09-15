//  创建一个QVue类 ，该类接收的是一个options的对象 也就是我们在实例化Vue的时候需要传递的参数
class QVue{
    //构造方法
    constructor(options){
        //缓存options对象数据  用$是为了防止命名污染的问题
        this.$options = options;
        //取出data数据 做数据响应，从这里可以观察到为什么 Vue实例上通过this.$data可以拿到我们所写的data数据
        this.$data = options.data || {};//如data不为空,则取data,如为空,则创建一个空对象

        //监听$data属性数据的变化
        this.observe(this.$data);

        new Compile( options.el, this );
    }
    //观察数据变化
    observe(data){
        //如果value不存在，或不是一个对象类型，则返回，不予监听
        if( !data || typeof data !=="object"){
            return;
        }
        //获取 data中所有的键
        let keys = Object.keys(data);//Object内置对象中的方法  用于   返回一个由一个给定对象的自身可枚举属性组成的数组
        //循环所有的键  绑定监听
        //1.name   2.age  3.html   4.person
        keys.forEach((key) =>{
            //利用Object.defineProperty完成  数据响应
            //data:是{}对象  key:当前的属性(name,age,html,person) 最后一个参数是值
            this.defineReactive(data,key,data[key]);  //递归

            //代理data中的属性到vue实例上
            this.proxyData(key);
        });
    }

    //代理Data
    proxyData(key){
        //这里的 this 指的是 vue对象 		key指的是$data中的每个键
        //vue.name  model
        //vue.age
        Object.defineProperty(this,key,{
            get() {
                return this.$data[key];
            },
            set(newVal) {
                this.$data[key] = newVal;
            }
        });
    }

    //利用Object.defineProperty完成  数据响应
    defineReactive(data,key,val){
        //解决数据层次嵌套，递归绑定监听
        this.observe(val);
        const subject = new Subject();  //被观察对象 用于管理  watcher
        //这里的obj 指的是  $data对象  key是它里面的一个属性
        //vue.$data.name;   	vue:mvvm:   model,   v:view  vm:view-model
        //vue.$data.age;
        Object.defineProperty(data,key,{
            get(){
                //向管理watcher的对象追加watcher实例，方便管理

                Subject.target && subject.addWatcher(Subject.target);

                return val;
            },
            set(newVal) {
                //如果值 没有发生变化 则返回
                if(newVal === val){
                    return;
                }
                //只有值 发生了变化才 进行更新并通知
                val = newVal;
                subject.notify();  //***通知观察者状态的变化
            }
        });
    }
}

class Compile{
    /*
        el :
        vm :vue对象
    */
    constructor( el , vm  ){
        this.$el = document.querySelector( el );
        this.$vm = vm;
        //判断el不为空，才能解析
        if( this.$el ){
            //切换
            this.$fragment=this.node2Fragment( this.$el );

            this.compile(  this.$fragment );

            //将编译解析完成html结果追加回页面节点
            this.$el.appendChild( this.$fragment );
        }
    }
    node2Fragment( el ){
        const frag =  document.createDocumentFragment( );
        let child;
        while( child = el.firstChild ){
            frag.appendChild( child );
        }
        return frag;

    }

    compile( frags ){
        const childNodes = frags.childNodes;
        //循环数组
        Array.from( childNodes ).forEach( node=>{
            //判断这个node是否为一个 {{插值节点}}
            if( this.isInterpolation ( node )){
                // console.log( " 这是一个插值节点： " +node.textContent + RegExp.$1 );
                this.compileText( node ); //想让vue.$data.name的值显示到 node节点的{{name}}中
            }
            // ...... 扩展的重灾区...所有的解析
            //目标：解析： <xxx q-html="">   <xxx q-text="">   =>它位于元素节点中的属性
            if( this.isElement( node )){
                const nodeAttrs =  node.attributes; //即 q-text="name"
                Array.from( nodeAttrs ).forEach( attr=>{
                    const attrName = attr.name; //q-text
                    const attrValue = attr.value;//name
                    //判断是否为vue支持的指令，这个自定义的vue框架支持的指令都为 v-开头
                    if( this.isDirective( attrName )){
                        const type =  attrName.substring(2);
                        //从vue对象取出  attrValue所对应的值
                        //反射机制  去this中找 type  找到就激活
                        //this.text( node ,vm , attrValue )
                        this[ type ]&& this[type]( node , this.$vm , attrValue);
                    }
                    //判断是否为vue支持的事件  @click  @dbclick
                    if(  this.isEvent(attrName)){
                        //事件类型
                        let type = attrName.substring(1);
                        //			要添加事件的节点  事件类型    vue对象     回调函数名
                        this.eventHandler( node , type , this.$vm , attrValue );
                    }
                });
            }

            //递归子元素  ，因为<p>{{name}}</p>
            if( node.childNodes && node.childNodes.length ){
                //递归compile
                this.compile( node );
            }
        } );
    }
    //事件处理绑定  <div @click="show()">  show()是vue对象中methods中的一个函数
    eventHandler( node , eventType,  vm , methodName ){
        let func = vm.$options&&vm.$options.methods&&vm.$options.methods[ methodName ];
        if(  func && methodName ){
            //给node绑定事件
            node.addEventListener(  eventType , func.bind( vm ) );
        }
    }
    //判断node是否为元素节点
    isElement( node ){
        return node.nodeType===1;
    }
    //判断 是否为vue支持的指令  这类指令以  q-
    isDirective(  attrName ){
        return attrName.indexOf("q-")==0;
    }
    //判断是否为vue支持的事件  @开头+事件名字  例 @click="show"
    isEvent( attrName ){
        return attrName.indexOf("@")==0;
    }

    //判断这个node是否为一个插值文本 {{ }}
    isInterpolation( node ){
        //DOM:中节点类型  文本节点为3 元素节点：1 .。。
        let reg = /\{\{(.*)\}\}/;
        return node.nodeType==3 && reg.test( node.textContent );
    }
    compileText( node ){
        let key = RegExp.$1;
        //更新界面文本
        this.update( node , this.$vm , key ,"text");
    }
    //node : <p q-text="name"></p>
    //vm: vue对象
    //key:vue中的属性
    text( node ,vm , key ){
        this.update( node , vm , key , "text");
    }
    html( node ,vm , key ){
        this.update( node , vm , key , "html");
    }
    model( node , vm , key ){
        this.update( node , vm , key , "model");
        //绑定  值  修改事件
        node.addEventListener('change', function() {
            vm[key]=node.value;
        });
    }
    modelUpdater( node , value ){
        node.value = value;
    }
    textUpdater( node , value ){
        node.textContent = value; //document.getElmentByid("").innerText=value;
    }
    htmlUpdater( node , value ){
        node.innerHTML = value;
    }
    //node ：要更新的节点
    //vm ：vue对象
    //key ： $data中的属性
    //type：节点的类型
    update( node , vm , key , type){

        const updateFunc =  this[`${type}Updater`];

        updateFunc&&updateFunc( node , vm[key]  );

        //创建  Watcher ，注册到  vm[key] 的Subject的观察者列表中
        new Watcher(  vm , key , function(  value  ){
            updateFunc&&updateFunc( node ,value);
        });
    }
}

//被观察的主题   它里面有watcher列表
class Subject{
    constructor(){
        //存储
        this.watchers = [];
    }
    //  注册/添加watcher
    addWatcher(watcher){
        this.watchers.push(watcher);
    }
    //通知所有的watcher进行更新
    notify(){
        this.watchers.forEach((watcher)=>{
            watcher.update();
        })
    }
}
//观察者  做具体更新
class Watcher{
    constructor(vm,key,func){
        //vue 实例
        this.vm = vm;
        //需要更新的key
        this.key = key;
        //更新后执行的函数
        this.func = func;

        //将当前watcher实例指定到Dep静态属性target，用来在类间进行通信
        Subject.target = this;
        // ***  触发getter，添加依赖
        this.vm[this.key];  // this.$data["name"] -> get获取属性 -> Object.defineProperty() -> get()
        Subject.target = null ;
    }

    update(){
        //相当于：this.vm.func( this.vm[this.key] ); 即把值返回到界面上
        //    ->  this.$data.函数( this.$data["name"] )
        this.func.call(this.vm,this.vm[this.key]);
    }


}
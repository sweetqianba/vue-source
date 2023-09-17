var apiURL = 'https://api.github.com/repos/vuejs/vue/commits?per_page=3&sha='
/**
 * Actual demo
 */
// 自定义全局组件
// Vue.component('my-component', { name: 'MyComponent', render: function (h) { return h('div', 'MyComponent') } })
const Child = {
  name: "child", props: {
    a: { type: String, default: 'a' }
  }, data() {
    return {
      b: { c: 'c' }
    }
  },
  components: {
    MyComponent: { name: 'MyComponent', render: function (h) { return h('div', 'MyComponent') } }
  },
  render: function (h) { return h('my-component') }
}
new Vue({
  // el: '#demo',
  render: h => h(Child),

  // components:{
  //   aaa: {name:"aaa",render:function(h){return h('div',h(Child))}}
  // },

  // data: {
  //   branches: ['main', 'dev'],
  //   currentBranch: 'main',
  //   commits: null
  // },

  // created: function () {
  //   this.fetchData()
  // },

  // watch: {
  //   currentBranch: 'fetchData'
  // },

  // filters: {
  //   truncate: function (v) {
  //     var newline = v.indexOf('\n')
  //     return newline > 0 ? v.slice(0, newline) : v
  //   },
  //   formatDate: function (v) {
  //     return v.replace(/T|Z/g, ' ')
  //   }
  // },

  // methods: {
  //   fetchData: function () {
  //     var self = this
  //     var xhr = new XMLHttpRequest()
  //     xhr.open('GET', apiURL + self.currentBranch)
  //     xhr.onload = function () {
  //       self.commits = JSON.parse(xhr.responseText)
  //       console.log(self.commits[0].html_url)
  //     }
  //     xhr.send()
  //   }
  // }
}).$mount('#demo')

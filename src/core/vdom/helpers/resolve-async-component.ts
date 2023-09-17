import {
  warn,
  once,
  isDef,
  isUndef,
  isTrue,
  isObject,
  hasSymbol,
  isPromise,
  remove
} from 'core/util/index'

import VNode, { createEmptyVNode } from 'core/vdom/vnode'
import { currentRenderingInstance } from 'core/instance/render'
import type { VNodeData } from 'types/vnode'
import type { Component } from 'types/component'

function ensureCtor(comp: any, base) {
  if (comp.__esModule || (hasSymbol && comp[Symbol.toStringTag] === 'Module')) {
    comp = comp.default
  }
  return isObject(comp) ? base.extend(comp) : comp
}

export function createAsyncPlaceholder(
  factory: Function,
  data: VNodeData | undefined,
  context: Component,
  children: Array<VNode> | undefined,
  tag?: string
): VNode {
  const node = createEmptyVNode()
  node.asyncFactory = factory
  node.asyncMeta = { data, context, children, tag }
  return node
}

/**
 * 一共处理三种动态组件配置
 * 1、模拟promise的resolve和reject
 * Vue.component('async-example', function (resolve, reject) {
    require(['./my-async-component'], resolve)
  })
 * 2、Promise创建组件
  Vue.component(
    'async-webpack-example',
    // 该 `import` 函数返回一个 `Promise` 对象。
    () => import('./my-async-component')
  )
 * 3、高级配置项产生的异步组件
  const AsyncComp = () => ({
    // 需要加载的组件。应当是一个 Promise
    component: import('./MyComp.vue'),
    // 加载中应当渲染的组件
    loading: LoadingComp,
    // 出错时渲染的组件
    error: ErrorComp,
    // 渲染加载中组件前的等待时间。默认：200ms。
    delay: 200,
    // 最长等待时间。超出此时间则渲染错误组件。默认：Infinity
    timeout: 3000
  })
  Vue.component('async-example', AsyncComp)
 */
export function resolveAsyncComponent(
  factory: { (...args: any[]): any; [keye: string]: any },
  baseCtor: typeof Component
): typeof Component | void {
  if (isTrue(factory.error) && isDef(factory.errorComp)) {
    return factory.errorComp
  }

  if (isDef(factory.resolved)) {
    return factory.resolved
  }

  const owner = currentRenderingInstance
  if (owner && isDef(factory.owners) && factory.owners.indexOf(owner) === -1) {
    // already pending
    factory.owners.push(owner)
  }

  if (isTrue(factory.loading) && isDef(factory.loadingComp)) {
    return factory.loadingComp
  }

  if (owner && !isDef(factory.owners)) {
    const owners = (factory.owners = [owner])
    let sync = true
    let timerLoading: number | null = null
    let timerTimeout: number | null = null

    owner.$on('hook:destroyed', () => remove(owners, owner))

    const forceRender = (renderCompleted: boolean) => {
      for (let i = 0, l = owners.length; i < l; i++) {
        owners[i].$forceUpdate()
      }

      if (renderCompleted) {
        owners.length = 0
        if (timerLoading !== null) {
          clearTimeout(timerLoading)
          timerLoading = null
        }
        if (timerTimeout !== null) {
          clearTimeout(timerTimeout)
          timerTimeout = null
        }
      }
    }

    const resolve = once((res: Object | Component) => { // 回调的方式实现异步
      // cache resolved
      factory.resolved = ensureCtor(res, baseCtor)
      // invoke callbacks only if this is not a synchronous resolve
      // (async resolves are shimmed as synchronous during SSR)
      if (!sync) {
        forceRender(true)
      } else {
        owners.length = 0
      }
    })

    const reject = once(reason => {
      __DEV__ &&
        warn(
          `Failed to resolve async component: ${String(factory)}` +
            (reason ? `\nReason: ${reason}` : '')
        )
      if (isDef(factory.errorComp)) {
        factory.error = true
        forceRender(true)
      }
    })

    const res = factory(resolve, reject) // 2、3种方式都是有返回值的

    if (isObject(res)) {
      if (isPromise(res)) { // 2返回的是promise
        // () => Promise
        if (isUndef(factory.resolved)) {
          res.then(resolve, reject)
        }
      } else if (isPromise(res.component)) { // 3返回的component是promise
        res.component.then(resolve, reject)

        if (isDef(res.error)) {
          factory.errorComp = ensureCtor(res.error, baseCtor)
        }

        if (isDef(res.loading)) {
          factory.loadingComp = ensureCtor(res.loading, baseCtor)
          if (res.delay === 0) {
            factory.loading = true
          } else {
            // @ts-expect-error NodeJS timeout type
            timerLoading = setTimeout(() => {
              timerLoading = null
              if (isUndef(factory.resolved) && isUndef(factory.error)) {
                factory.loading = true
                forceRender(false)
              }
            }, res.delay || 200)
          }
        }

        if (isDef(res.timeout)) {
          // @ts-expect-error NodeJS timeout type
          timerTimeout = setTimeout(() => {
            timerTimeout = null
            if (isUndef(factory.resolved)) {
              reject(__DEV__ ? `timeout (${res.timeout}ms)` : null)
            }
          }, res.timeout)
        }
      }
    }

    sync = false
    // return in case resolved synchronously
    return factory.loading ? factory.loadingComp : factory.resolved
  }
}

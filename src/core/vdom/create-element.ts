import config from '../config'
import VNode, { createEmptyVNode } from './vnode'
import { createComponent } from './create-component'
import { traverse } from '../observer/traverse'

import {
  warn,
  isDef,
  isUndef,
  isArray,
  isTrue,
  isObject,
  isPrimitive,
  resolveAsset,
  isFunction
} from '../util/index'

import { normalizeChildren, simpleNormalizeChildren } from './helpers/index'
import type { Component } from 'types/component'
import type { VNodeData } from 'types/vnode'

const SIMPLE_NORMALIZE = 1
const ALWAYS_NORMALIZE = 2

// wrapper function for providing a more flexible interface
// without getting yelled at by flow
export function createElement(
  context: Component, // vue实例
  tag: any, // 标签，可以是一个字符串，也可以是component
  data: any,
  children: any,
  normalizationType: any, // 表示子阶段规范的类型，区分render是手写的还是编译生成的
  alwaysNormalize: boolean
): VNode | Array<VNode> {
  if (isArray(data) || isPrimitive(data)) {
    normalizationType = children
    children = data
    data = undefined
  }
  if (isTrue(alwaysNormalize)) {
    normalizationType = ALWAYS_NORMALIZE
  }
  return _createElement(context, tag, data, children, normalizationType)
}

// 虚拟节点的创建
export function _createElement(
  context: Component,
  tag?: string | Component | Function | Object,
  data?: VNodeData,
  children?: any,
  normalizationType?: number
): VNode | Array<VNode> {
  console.log('pppppppppppppppp',children)
  if (isDef(data) && isDef((data as any).__ob__)) {
    __DEV__ &&
      warn(
        `Avoid using observed data object as vnode data: ${JSON.stringify(
          data
        )}\n` + 'Always create fresh vnode data objects in each render!',
        context
      )
    return createEmptyVNode()
  }
  // object syntax in v-bind
  if (isDef(data) && isDef(data.is)) {
    tag = data.is
  }
  if (!tag) {
    // in case of component :is set to falsy value
    return createEmptyVNode()
  }
  // warn against non-primitive key
  if (__DEV__ && isDef(data) && isDef(data.key) && !isPrimitive(data.key)) {
    warn(
      'Avoid using non-primitive value as key, ' +
        'use string/number value instead.',
      context
    )
  }
  // support single function children as default scoped slot
  if (isArray(children) && isFunction(children[0])) {
    data = data || {}
    data.scopedSlots = { default: children[0] }
    children.length = 0
  }
  // 将children规范成vnode类型
  if (normalizationType === ALWAYS_NORMALIZE) { // render是用户手写的
    children = normalizeChildren(children)
  } else if (normalizationType === SIMPLE_NORMALIZE) { // render是编译生成的
    children = simpleNormalizeChildren(children)
  }
  console.log('oooooooooooooooooooooooooooooooooooooo',children)
  // 生成本级vnode
  let vnode, ns
  // tag <div> <myComponent> <component is="xxx"> <node>  =>vode
  // 如果tag是普通的html标签，则会实例一个普通的VNode
  if (typeof tag === 'string') {
    let Ctor
    ns = (context.$vnode && context.$vnode.ns) || config.getTagNamespace(tag)
    if (config.isReservedTag(tag)) { // 如果是内置html元素或者svg元素，则直接声明vnode
      // platform built-in elements
      if (
        __DEV__ &&
        isDef(data) &&
        isDef(data.nativeOn) &&
        data.tag !== 'component'
      ) {
        warn(
          `The .native modifier for v-on is only valid on components but it was used on <${tag}>.`,
          context
        )
      }
      vnode = new VNode(
        config.parsePlatformTagName(tag),
        data,
        children,
        undefined,
        undefined,
        context
      )
    } else if (
      (!data || !data.pre) &&
      isDef((Ctor = resolveAsset(context.$options, 'components', tag)))
    ) {
      // 全局定义的component和部分局部定义component走这里
      vnode = createComponent(Ctor, data, context, children, tag)
    } else {
      // unknown or unlisted namespaced elements
      // check at runtime because it may get assigned a namespace when its
      // parent normalizes children
      vnode = new VNode(tag, data, children, undefined, undefined, context)
    }
  } else {
    // 如果tag不是普通html标签，则通过createComponent初始化一个组件VNode
    // direct component options / constructor
    // node => vode   { node } 
    vnode = createComponent(tag as any, data, context, children)
  }
  console.log('11111111111111111111111', children)
  if (isArray(vnode)) {
    return vnode
  } else if (isDef(vnode)) {
    if (isDef(ns)) applyNS(vnode, ns)
    if (isDef(data)) registerDeepBindings(data)
    return vnode
  } else {
    return createEmptyVNode()
  }
}

function applyNS(vnode, ns, force?: boolean) {
  vnode.ns = ns
  if (vnode.tag === 'foreignObject') {
    // use default namespace inside foreignObject
    ns = undefined
    force = true
  }
  if (isDef(vnode.children)) {
    for (let i = 0, l = vnode.children.length; i < l; i++) {
      const child = vnode.children[i]
      if (
        isDef(child.tag) &&
        (isUndef(child.ns) || (isTrue(force) && child.tag !== 'svg'))
      ) {
        applyNS(child, ns, force)
      }
    }
  }
}

// ref #5318
// necessary to ensure parent re-render when deep bindings like :style and
// :class are used on slot nodes
function registerDeepBindings(data) {
  if (isObject(data.style)) {
    traverse(data.style)
  }
  if (isObject(data.class)) {
    traverse(data.class)
  }
}

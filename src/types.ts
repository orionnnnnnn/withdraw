/**
 * 已关闭标签页的信息接口
 */
export interface ClosedTab {
  /** 唯一标识符 */
  id: string;
  /** 页面URL */
  url: string;
  /** 页面标题 */
  title: string;
  /** 网站图标URL */
  favicon?: string;
  /** 关闭时间戳 */
  closedAt: number;
  /** 所属窗口ID */
  windowId: number;
}

/**
 * 标签页缓存信息接口
 */
export interface TabInfo {
  /** 页面URL */
  url: string;
  /** 页面标题 */
  title: string;
  /** 网站图标URL */
  favicon?: string;
  /** 窗口ID */
  windowId: number;
}

/**
 * 存储数据结构接口
 */
export interface StorageData {
  /** 已关闭的标签页列表 */
  closedTabs: ClosedTab[];
  /** 扩展设置 */
  settings: {
    /** 最大历史记录数量 */
    maxHistory: number;
  };
}

/**
 * 存储键名常量
 */
export const STORAGE_KEYS = {
  CLOSED_TABS: 'closedTabs',
  SETTINGS: 'settings'
} as const;

/**
 * 默认设置
 */
export const DEFAULT_SETTINGS = {
  maxHistory: 50
} as const;

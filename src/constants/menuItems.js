export const menuItems = [
  {
    name: 'Welcome',
    path: 'welcome',
    view: 'welcome',
    iconType: 'Home',
    enabled: true,
    component: "Welcome"
  },
  {
    name: 'Chat',
    path: 'chat',
    view: 'chat',
    iconType: 'QuestionAnswer',
    enabled: true,
    component: "LLMChat"
  },
  {
    name: 'Agents',
    path: 'agents',
    view: 'agents',
    iconType: 'SmartToy',
    enabled: false,
    component: "Agents"
  },
  {
    name: 'Tools',
    path: 'tools',
    view: 'tools',
    iconType: 'Handyman',
    enabled: true,
    component: "Tools"
  },
  {
    name: 'Knowledge',
    path: 'knowledge',
    view: 'knowledge',
    iconType: 'ManageSearch',
    enabled: true,
    component: "KnowledgeList"
  },
  {
    name: 'Demo Files',
    path: 'demofiles',
    view: 'demofiles',
    iconType: 'FileDownload',
    enabled: true,
    component: "DemoFiles"
  }
];

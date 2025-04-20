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
    name: 'Functions',
    path: 'functions',
    view: 'functions',
    iconType: 'Code',
    enabled: false,
    component: "Functions"
  },
  {
    name: 'Demo Files',
    path: 'demofiles',
    view: 'demofiles',
    iconType: 'FileDownload',
    enabled: true,
    component: "DemoFiles"
  },
  {
    name: 'RAG',
    path: 'rag',
    view: 'rag',
    iconType: 'ManageSearch',
    enabled: false,
    component: "RAG"
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
    name: 'Agents',
    path: 'agents',
    view: 'agents',
    iconType: 'SmartToy',
    enabled: false,
    component: "Agents"
  }
];

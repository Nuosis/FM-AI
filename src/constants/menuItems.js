export const menuItems = [
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
    enabled: true,
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
    enabled: false,
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

// إعدادات «عبدو نيوز». عدّل هذا الملف فقط عند تغيير بيانات التواصل.
window.KHABAR_CONFIG = {
  EMAIL: "munijizqa@gmail.com",
  PHONE: "+974 5160 0498",
  WHATSAPP: "97451600498",
  SITE: "https://munjiz-qa.github.io/abdo-news/",
  REPO: "munjiz-qa/munjiz-qa.github.io",
  BRANCH: "main",
  // خادم «عبدو نيوز» على Cloudflare: البلاغات والاشتراكات والإحصاءات. على عنوان Cloudflare نفسه يكون الطلب من الأصل ذاته.
  API: /workers\.dev$/.test(location.hostname) ? "" : "https://khabar.baseeratactions.workers.dev"
};

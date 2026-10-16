'use strict';
// English for the management panel (crm.html). The panel is written in Arabic; with English chosen, every Arabic
// interface text is replaced as it appears (exact phrases first, then patterns with numbers or names).
// Data typed by people (client names, notes, messages) stays as written. Choice: ?lang=en / ?lang=ar, or the button in the header.
(function(){
const KEY='munjiz_crm_lang';
const q=new URLSearchParams(location.search).get('lang');
try{if(q==='en'||q==='ar')localStorage.setItem(KEY,q)}catch(e){}
let lang='ar';try{lang=localStorage.getItem(KEY)==='en'?'en':'ar'}catch(e){}
const EN=lang==='en';
window.CRM_LANG=lang;

const W={
// header, tabs, sign-in
'لوحة الإدارة | منجز لخدمات الأعمال':'Admin panel | Munjiz Business Services','الخدمات المساعدة':'Supporting services','حزم الخدمات':'Service bundles','الباقات الشهرية':'Monthly packages','منجز بداية':'Munjiz Start','منجز متابعة':'Munjiz Follow-up','الحزم':'Bundles','لوحة الإدارة':'Admin panel','أقسام لوحة الإدارة':'Admin panel sections',
'لوحة المتابعة':'Dashboard','الطلبات':'Requests','العملاء':'Clients','المعاملات':'Transactions','المراسلات':'Messages','السجل':'Log','الموظفون':'Staff','حسابي':'My account','خروج':'Sign out',
'دخول الإدارة والموظفين':'Manager and staff sign-in','اسم المستخدم':'Username','كلمة المرور':'Password','دخول':'Sign in','دخول العملاء':'Client sign-in',
'غيّر بيانات الدخول':'Change your sign-in details','هذا أول دخول. لحماية بيانات العملاء اختر اسم مستخدم وكلمة مرور جديدين.':'This is the first sign-in. To protect client data, choose a new username and password.',
'اسم المستخدم الجديد':'New username','كلمة المرور الجديدة (8 أحرف على الأقل)':'New password (at least 8 characters)','أعد كتابة كلمة المرور':'Repeat the password','حفظ والمتابعة':'Save and continue',
'اكتب اسم المستخدم وكلمة المرور.':'Type your username and password.','كلمتا المرور غير متطابقتين.':'The two passwords do not match.','تم حفظ بيانات الدخول الجديدة':'Your new sign-in details are saved',
// errors
'ليست لديك صلاحية لهذا الإجراء. راجع المدير.':'You do not have permission for this. Please ask the manager.','اسم المستخدم أو كلمة المرور غير صحيحة.':'The username or password is incorrect.',
'محاولات كثيرة، حاول بعد ساعة.':'Too many attempts. Try again in an hour.','كلمة المرور 8 أحرف على الأقل.':'The password must be at least 8 characters.',
'اسم المستخدم غير صالح (3 أحرف على الأقل وبدون مسافات).':'Invalid username (at least 3 characters, no spaces).','اسم المستخدم مستخدم من قبل.':'This username is already taken.',
'غيّر اسم المستخدم (ليس 123) وكلمة المرور معاً.':'Change both the username (not 123) and the password.','هذا الإجراء للمدير فقط.':'Only the manager can do this.',
'لا يمكن إيقاف آخر مدير أو تحويله إلى موظف.':'The last manager cannot be suspended or changed to staff.','الملف أكبر من 10 ميجابايت.':'The file is larger than 10 MB.',
'غير موجود.':'Not found.','بيانات غير مكتملة.':'Incomplete details.','لا يمكن تعديل هذا السجل مباشرة.':'This record cannot be edited directly.','غيّر بيانات الدخول أولاً.':'Change your sign-in details first.',
'انتهت الجلسة، سجّل الدخول مرة أخرى':'Your session has ended. Please sign in again.','خطأ':'Error',
'تعمل هذه الميزة بعد تشغيل الخادم (راجع ملف «اقرأني - تشغيل نظام العملاء»).':'This works once the server is running (see the “Client system setup” guide).',
'تعمل بعد تشغيل الخادم (ملف «اقرأني - تشغيل نظام العملاء»).':'Works once the server is running (see the “Client system setup” guide).',
'المراسلات مع العملاء تعمل بعد تشغيل الخادم.':'Messages with clients work once the server is running.',
// mode bar
'متصل بخادم المكتب. البيانات محفوظة في Google Sheets ويصل الرد بالبريد للعملاء تلقائياً.':'Connected to the office server. Data is saved in Google Sheets and replies reach clients by email automatically.',
'وضع محلي:':'Local mode:','البيانات تُحفظ في هذا المتصفح على هذا الجهاز فقط، والبريد يُفتح في برنامج البريد لديك. لتشغيل الحفظ المركزي والرد التلقائي اتبع ملف «اقرأني - تشغيل نظام العملاء». خذ نسخة احتياطية من قسم السجل بانتظام.':'Data is saved in this browser on this device only, and email opens in your mail app. To save centrally and reply automatically, follow the “Client system setup” guide. Take a backup from the Log section regularly.',
// statuses and values
'جديدة':'New','بانتظار المستندات':'Waiting for documents','قيد التقديم':'Being submitted','قيد المتابعة لدى الجهة':'With the authority','بانتظار العميل':'Waiting for the client','منجزة':'Completed','ملغاة':'Cancelled',
'جديد':'New','تم التواصل':'Contacted','تحوّل إلى معاملة':'Became a transaction','مغلق':'Closed',
'مفعّل':'Active','بانتظار التفعيل':'Waiting for activation','موقوف':'Suspended','نعم':'Yes','فرد':'Individual','منشأة':'Company',
'بدون باقة':'No package','أساس':'Asas','شامل':'Shamel','نخبة':'Nukhba','الذهبية':'Gold','باقات التأسيس':'Setup bundles',
'الموقع':'Website','زيارة المكتب':'Office visit','توصية':'Referral','شبكة المالك':'Owner’s network','أخرى':'Other','حساب الموقع':'Website account','المكتب':'Office',
'المدير العام':'General manager','مدير العلاقات الحكومية':'Government relations manager','المندوب':'Representative','منسق خدمة العملاء':'Customer service coordinator','مندوب':'Representative','محاسب':'Accountant','مستشار':'Consultant',
'المدير':'Manager','مدير':'Manager','موظف':'Staff','انتهت دون خروج':'Ended without signing out',
// dashboard
'طلبات جديدة من الموقع':'New requests from the website','معاملات تجاوزت الموعد المتوقع':'Transactions past their expected date','مستندات تنتهي خلال 30 يوماً':'Documents expiring within 30 days',
'اشتراكات باقات تنتهي خلال 30 يوماً':'Package subscriptions ending within 30 days','رسائل العملاء التي تنتظر الرد':'Client messages waiting for a reply','حسابات تنتظر التفعيل':'Accounts waiting for activation',
'طلبات جديدة':'New requests','معاملات مفتوحة':'Open transactions','رسائل تنتظر الرد':'Messages waiting for a reply','متأخرة':'Late','منجزة هذا الشهر':'Completed this month','أتعاب منجزة هذا الشهر':'Fees completed this month',
'ر.ق':'QAR','مستحق على العملاء':'Owed by clients','لا يوجد.':'None.','لا يوجد':'None','لا توجد بيانات.':'No data.','اتصل بالعميل للتأكد ثم فعّل الحساب من ملفه':'Call the client to confirm, then activate the account from their file',
// requests
'الطلبات الواردة':'Incoming requests','كل الحالات':'All statuses','بحث بالاسم أو الجوال':'Search by name or mobile','تصدير Excel':'Export to Excel','أُرسل':'Sent','رد بالبريد':'Reply by email','تحويل إلى معاملات':'Convert to transactions',
'الرقم':'No.','العميل':'Client','الخدمات المطلوبة':'Requested services','الباقة':'Package','التأكيد بالبريد':'Email confirmation','الحالة والإجراء':'Status and action',
// clients
'بحث بالاسم أو الجوال أو الرقم الشخصي أو السجل':'Search by name, mobile, QID or CR','عميل جديد':'New client','رجوع إلى العملاء':'Back to clients','تعديل البيانات':'Edit details','معاملة جديدة':'New transaction','إرسال بريد':'Send email','واتساب':'WhatsApp','إضافة ملاحظة':'Add a note',
'البيانات والأرقام':'Details and numbers','المتطلبات والملاحظات':'Requirements and notes','معاملات العميل وأعماله':'Client’s transactions and work','المراسلات مع العميل':'Messages with the client',
'اكتب ردك على العميل. يظهر في حسابه ويصله بالبريد إن كان مسجلاً.':'Write your reply to the client. It shows in their account and reaches them by email if they have one.','إرسال الرد':'Send reply','إرسال نسخة بالبريد':'Also send by email',
'حساب العميل على الموقع':'Client’s website account','الملفات والتراخيص المرفوعة للعميل':'Files and licences uploaded for the client','عنوان الملف كما يراه العميل':'File title as the client sees it','مثال: السجل التجاري بعد التجديد':'e.g. Commercial registration after renewal',
'المعاملة المرتبطة (اختياري)':'Related transaction (optional)','بدون':'None','الملف (حتى 10 ميجابايت)':'File (up to 10 MB)','أو رابط (Google Drive أو غيره)':'Or a link (Google Drive or other)','رفع للعميل':'Upload for the client',
'بيانات الدخول إلى البوابات الحكومية':'Government portal logins','كلمات المرور مشفرة. كل إظهار يُسجَّل باسمك في سجل العميل.':'Passwords are encrypted. Every reveal is recorded under your name in the client’s log.',
'الموافقات القانونية':'Legal acceptances','سجل التواصل':'Contact log','فتح الملف الكامل للعميل':'Open the client’s full file','الملف':'File','الاسم':'Name','الجوال':'Mobile','الرقم الشخصي أو السجل':'QID or CR','الحساب':'Account','المعاملات / المفتوحة':'Transactions / open',
'المتطلبات':'Requirements','الرقم الشخصي':'QID','السجل التجاري':'CR','بطاقة المنشأة':'Establishment card','الرقم الضريبي':'Tax no.','البريد':'Email','نهاية الاشتراك':'Subscription ends','العنوان':'Address','المصدر':'Source','تاريخ الإضافة':'Date added',
'لا توجد بيانات إضافية.':'No further details.','لا توجد متطلبات مسجلة.':'No requirements recorded.','لا يوجد تواصل مسجل.':'No contact recorded.','اكتب الملاحظة أو ملخص المكالمة':'Write the note or a summary of the call','حفظ':'Save','ملاحظة':'Note',
'اكتب جوالاً قطرياً من 8 أرقام':'Enter an 8-digit Qatari mobile','إضافة عميل جديد':'Add a new client','حذف العميل؟ لن تُحذف معاملاته.':'Delete the client? Their transactions are kept.','حذف':'Delete',
'لا توجد رسائل بعد. اكتب للعميل وسيراها في حسابه.':'No messages yet. Write to the client and they will see it in their account.','لم يدخل بعد':'Not signed in yet','الحالة':'Status','تاريخ الإنشاء':'Created','آخر دخول':'Last sign-in',
'ليس للعميل حساب على الموقع. يمكنه إنشاؤه بنفسه من صفحة «حسابي»، أو أنشئه له هنا.':'The client has no website account. They can create one from the “My account” page, or you can create it here.',
'تفعيل الحساب':'Activate account','تعديل أو إعادة تعيين كلمة المرور':'Edit or reset the password','إنشاء حساب للعميل':'Create an account for the client','إيقاف الحساب':'Suspend account',
'لم يُرفع للعميل أي ملف بعد.':'No file has been uploaded for this client yet.','يُحفظ الملف خاصاً في Google Drive للمكتب، ولا يصل إليه إلا العميل من حسابه.':'The file is kept private in the office’s Google Drive; only the client can reach it, from their account.',
'الوضع المحلي: أضف رابطاً فقط.':'Local mode: add a link only.','إظهار':'Reveal','لم يضف العميل بيانات دخول لأي بوابة.':'The client has not added any portal login.','لا توجد موافقات مسجلة.':'No acceptances recorded.',
'أُرسل الرد وظهر في حساب العميل ووصله بالبريد':'Reply sent: it shows in the client’s account and was emailed','أُرسل الرد وظهر في حساب العميل':'Reply sent: it shows in the client’s account',
'تم تحديث الحساب':'Account updated','تم الحفظ':'Saved','اكتب العنوان واختر ملفاً أو ضع رابطاً':'Type a title and choose a file or paste a link','جارٍ الرفع…':'Uploading…','أُضيف الملف إلى حساب العميل':'The file was added to the client’s account',
'حذف الملف من حساب العميل؟ يُنقل ملف Drive إلى سلة المهملات.':'Remove the file from the client’s account? The Drive file moves to the bin.','نسخ':'Copy','نُسخت كلمة المرور':'Password copied','فتح':'Open',
'آخر رسالة':'Last message','من':'From','التاريخ':'Date','بيانات العميل':'Client details','الاسم أو اسم المنشأة':'Name or company name','النوع':'Type','البريد الإلكتروني':'Email','الرقم الشخصي (QID)':'Personal ID (QID)','رقم السجل التجاري':'CR number','رقم بطاقة المنشأة':'Establishment card no.',
'مصدر العميل':'Client source','متطلبات العميل (ما يحتاجه حالياً ولاحقاً)':'Client requirements (what they need now and later)','ملاحظات':'Notes','إلغاء':'Cancel','حذف العميل':'Delete client',
'كلمة مرور جديدة (اتركها فارغة للإبقاء على الحالية)':'New password (leave empty to keep the current one)','أرسل للعميل اسم المستخدم وكلمة المرور على واتساب، واطلب منه تغييرها من «حسابي».':'Send the client the username and password on WhatsApp, and ask them to change it from “My account”.',
'كلمة مرور عشوائية':'Random password',
// transactions
'المفتوحة فقط':'Open only','بحث بالعميل أو الخدمة أو رقم الطلب لدى الجهة':'Search by client, service or authority reference','بيانات المعاملة':'Transaction details','الخدمة':'Service','المسؤول':'Assigned to',
'أتعاب منجز (ر.ق)':'Munjiz fee (QAR)','الرسوم الحكومية (ر.ق)':'Government fees (QAR)','المدفوع من العميل (ر.ق)':'Paid by the client (QAR)','رقم الطلب لدى الجهة':'Authority reference no.','تاريخ البدء':'Start date','الموعد المتوقع للإنجاز':'Expected completion',
'تاريخ انتهاء المستند الناتج (للتذكير بالتجديد)':'Expiry of the resulting document (for renewal reminders)','تاريخ الإغلاق':'Closing date','المستندات المطلوبة (علّم ما استُلم)':'Required documents (tick what was received)','أضف مستنداً آخر':'Add another document','إضافة':'Add',
'حذف المعاملة':'Delete transaction','الأتعاب':'Fee','الرسوم':'Gov. fees','المتبقي':'Balance','الموعد المتوقع':'Expected','انتهاء المستند':'Document expiry','المستندات':'Documents','اختر الخدمة…':'Choose the service…','خدمة أخرى غير مدرجة':'Another service, not listed',
'اختر الخدمة لتظهر مستنداتها.':'Choose the service to see its documents.','اختر العميل…':'Choose the client…','خدمة أخرى':'Other service','تغيرت حالة المعاملة. هل تريد إبلاغ العميل بالبريد؟':'The transaction status changed. Do you want to tell the client by email?','اكتب البريد':'Write the email',
'حذف المعاملة نهائياً؟':'Delete the transaction permanently?',
// email dialog
'إرسال بريد للعميل':'Email the client','القالب':'Template','إلى':'To','الموضوع':'Subject','الرسالة':'Message','إرسال':'Send','لغة البريد':'Email language',
'تأكيد استلام الطلب':'Request received','طلب المستندات':'Documents needed','تحديث حالة المعاملة':'Status update','إنجاز المعاملة':'Transaction completed','تذكير بالتجديد':'Renewal reminder','عرض سعر':'Quote','رسالة حرة':'Free message',
'يُرسل من بريد المكتب مباشرة ويُسجَّل في سجل العميل.':'Sent from the office email directly and recorded in the client’s log.','الوضع المحلي: سيفتح برنامج البريد لديك برسالة جاهزة، وتُسجَّل في سجل العميل.':'Local mode: your mail app opens with the message ready, and it is recorded in the client’s log.',
'أُرسل البريد':'Email sent','فُتح برنامج البريد':'Mail app opened','تعذر الإرسال:':'Could not send:',
// log
'سجل التواصل والأحداث':'Contacts and events log','نسخة احتياطية كاملة':'Full backup','استرجاع نسخة':'Restore a backup','بريد':'Email','تحديث':'Update','طلب من الموقع':'Website request','حساب':'Account','ملف':'File','بوابة':'Portal','مراسلة':'Message','تسجيل':'Registration',
'لا توجد أحداث.':'No events.','آخر تحديث':'Last updated','رقم العميل':'Client no.','رمز الخدمة':'Service code','الرسوم الحكومية':'Government fees','المدفوع':'Paid','الخدمات':'Services','الرموز':'Codes','اللغة':'Language','أُرسل التأكيد':'Confirmation sent','رقم المعاملة':'Transaction no.','النص':'Text','بواسطة':'By',
'سيستبدل هذا كل البيانات الحالية على هذا الجهاز. متابعة؟':'This replaces all current data on this device. Continue?','استرجاع':'Restore','تم الاسترجاع':'Restored','ملف غير صالح':'Invalid file','تعذر الحفظ:':'Could not save:',
'status':'status','account':'account','file':'file','message':'message','credential':'credential','note':'note','email':'email','request':'request','error':'error',
// staff
'الموظفون: الحضور والإنجاز':'Staff: attendance and work','إضافة موظف':'Add staff member','اليوم':'Today','أمس':'Yesterday','آخر 7 أيام':'Last 7 days','هذا الشهر':'This month','فترة محددة':'Custom period','عرض التقرير':'Show report','إرسال بالبريد للمكتب':'Email to the office',
'الحضور اليومي':'Daily attendance','آخر أعماله':'Latest work','حسابات الموظفين':'Staff accounts','المراسلات مع العملاء':'Messages with clients','بيانات دخولي':'My sign-in details','كلمة المرور الحالية':'Current password','كلمة المرور الجديدة (اتركها فارغة إن لم تغيّرها)':'New password (leave empty to keep it)',
'أعد كتابة كلمة المرور الجديدة':'Repeat the new password','صلاحياتي':'My permissions','بيانات الموظف':'Staff details','الاسم الكامل':'Full name','المسمى الوظيفي':'Job title','كلمة مرور مؤقتة':'Temporary password','تاريخ التعيين':'Hire date','بداية الدوام':'Shift starts','نهاية الدوام':'Shift ends',
'أيام العمل':'Working days','مثال: الأحد إلى الخميس':'e.g. Sunday to Thursday','نوع الحساب':'Account type','مدير (كل الصلاحيات)':'Manager (all permissions)','الصلاحيات':'Permissions','صلاحيات كاملة':'All permissions','إلغاء الكل':'Clear all',
'عرض العملاء وملفاتهم':'View clients and their files','إضافة العملاء وتعديلهم':'Add and edit clients','المعاملات وحالاتها':'Transactions and their status','الأتعاب والمدفوعات':'Fees and payments','المراسلات والرد على العملاء':'Messages and replies to clients','رفع الملفات والتراخيص':'Upload files and licences',
'حسابات العملاء (تفعيل وكلمات مرور)':'Client accounts (activation and passwords)','إظهار كلمات مرور البوابات':'Reveal portal passwords','إرسال البريد للعملاء':'Email clients','الحذف':'Delete','السجل الكامل':'Full log',
'مدير: كل الصلاحيات، وإدارة الموظفين وتقاريرهم.':'Manager: all permissions, plus staff and their reports.','لا توجد صلاحيات بعد. راجع المدير.':'No permissions yet. Please ask the manager.','اتركها فارغة للإبقاء على كلمة مروره.':'Leave it empty to keep their password.',
'أرسلها للموظف، وسيغيّرها عند أول دخول.':'Send it to the staff member; they change it at first sign-in.','المسمى':'Title','الدوام':'Shift','مدير: كاملة':'Manager: all','كاملة':'All','لم يغيّر كلمة المرور المؤقتة':'Has not changed the temporary password','تعديل':'Edit',
'الموظف':'Staff member','أيام الحضور':'Days present','ساعات العمل':'Hours worked','تأخير':'Late days','كل الإجراءات':'All actions','معاملات أضافها':'Transactions added','معاملات أنجزها':'Transactions completed','تغيير حالات':'Status changes','ردود على العملاء':'Replies to clients',
'ملفات رفعها':'Files uploaded','عملاء أضافهم':'Clients added','التفاصيل':'Details','أول دخول':'First sign-in','آخر خروج':'Last sign-out','مدة العمل':'Time worked','ما زال داخلاً':'Still signed in','تأخر':'Late','خرج مبكراً':'Left early','جلسات':'sessions',
'لا توجد أعمال مسجلة في هذه الفترة.':'No work recorded in this period.','الإجراءات (الفترة)':'Actions (period)','ردود':'Replies','ملفات':'Files','أُرسل التقرير إلى':'Report sent to','الاسم الكامل للموظف':'Full name',
// email templates (subjects/bodies get their own English versions in crm.js)
'- (حدد المستندات)':'- (list the documents)','الخدمة المطلوبة':'the requested service',
// HR employee file
'الخدمات المكتبية':'Office services','البيانات الشخصية':'Personal details','الرقم الوظيفي':'Employee no.','تاريخ الميلاد':'Date of birth','الجنس':'Gender','ذكر':'Male','أنثى':'Female','الحالة الاجتماعية':'Marital status','أعزب':'Single','متزوج':'Married','العنوان في قطر':'Address in Qatar','الوظيفة والتخصص':'Job and specialisation','القسم':'Department','التخصص':'Specialisation','مثال: معاملات وزارة الداخلية':'e.g. Ministry of Interior transactions','المؤهل العلمي':'Qualification','مثال: بكالوريوس إدارة أعمال':"e.g. Bachelor's in business administration",'اللغات':'Languages','العربية، الإنجليزية':'Arabic, English','المدير المباشر':'Line manager','مكان العمل':'Work location','المكتب الرئيسي، الدوحة':'Head office, Doha','نهاية فترة التجربة':'Probation ends','المهارات':'Skills','مثال: أنظمة مطراش وحكومي، متابعة الشركات، خدمة العملاء':'e.g. Metrash and Hukoomi systems, company follow-up, customer service','الخبرات السابقة':'Previous experience','الوثائق وتواريخ انتهائها':'Documents and expiry dates','انتهاء البطاقة الشخصية':'QID expiry','رقم جواز السفر':'Passport no.','انتهاء جواز السفر':'Passport expiry','انتهاء الإقامة / تأشيرة العمل':'Residence / work visa expiry','انتهاء البطاقة الصحية':'Health card expiry','انتهاء رخصة القيادة':'Driving licence expiry','تصلك تذكرة في رسالة المتابعة اليومية قبل انتهاء أي وثيقة بـ 30 يوماً.':'The daily follow-up email reminds you 30 days before any document expires.','جهة الاتصال في الطوارئ والبنك':'Emergency contact and bank','اسم جهة الطوارئ':'Emergency contact name','صلة القرابة':'Relation','جوال الطوارئ':'Emergency mobile','البنك':'Bank','رقم الحساب الدولي (IBAN)':'IBAN','ابحث بالاسم أو التخصص أو المهارة':'Search by name, specialisation or skill','بحث في الموظفين':'Search staff','كل الأقسام':'All departments','العلاقات الحكومية':'Government relations','خدمة العملاء':'Customer service','المالية والحسابات':'Finance and accounts','الاستشارات':'Consulting','الإدارة':'Management',
};
const CODE={};
// the catalogue's own English names for services and authorities
try{const D=window.DETAILS||{},DT=typeof DATA!=='undefined'?DATA:null;if(DT){(DT.G||[]).forEach(([code,name,list])=>{const e=(D._entities||{})[code];if(e)W[name]=e;
  list.forEach(([c,n])=>{const x=(D[c]||{}).en;if(x&&x.name)W[n]=x.name})});(DT.SETUP||[]).forEach(([c,n])=>{const x=(D[c]||{}).en;if(x&&x.name)W[n]=x.name});
  (DT.CONSULT||[]).forEach(g=>{if(g.ar&&g.en)W[g.ar]=g.en;(g.items||[]).forEach(i=>{if(i.ar&&i.en){W[i.ar.n]=i.en.n;CODE[i.c]=i.en.n}})});
  (DT.G||[]).forEach(([,,list])=>list.forEach(([c])=>{const x=(D[c]||{}).en;if(x&&x.name)CODE[c]=x.name}));(DT.SETUP||[]).forEach(([c])=>{const x=(D[c]||{}).en;if(x&&x.name)CODE[c]=x.name})}}catch(e){}

// sections added with work distribution, finance and site colours
Object.assign(W,{"آراء العملاء": "Client reviews", "يظهر الرأي في الموقع فقط إذا وافق العميل على عرضه ثم ضغطت «انشر في الموقع».": "A review appears on the website only if the client agreed and you press Publish on site.", "الرئيسية": "Home", "العمل اليومي": "Daily work", "المالية": "Finance", "الحسابات": "Accounting", "الموارد البشرية": "Human resources", "الإعدادات": "Settings", "صفحات القسم": "Section pages", "لوحة المدير": "Manager dashboard", "مهامي": "My tasks", "توزيع العمل": "Work distribution", "الموظفون والحضور": "Staff and attendance", "بيانات دخولي": "My sign-in", "ألوان الموقع": "Site colours", "المستحقات والتحصيل": "Receivables and collection", "الفترة": "Period", "عرض": "Show", "هذا الشهر": "This month", "الشهر الماضي": "Last month", "آخر 3 أشهر": "Last 3 months", "هذه السنة": "This year", "كل الفترات": "All time", "الإيراد هو ما حُصّل فعلاً من العملاء في الفترة. التكاليف هي المصروفات المسجلة في قسم «المالية»، ومنها الرسوم الحكومية المدفوعة عن العملاء. صافي الربح = الإيراد − التكاليف.": "Revenue is what clients actually paid in the period. Costs are the expenses recorded under Finance, including government fees paid for clients. Net profit = revenue − costs.", "الإيراد والتكاليف في آخر 6 أشهر": "Revenue and costs, last 6 months", "المعاملات المفتوحة حسب الحالة": "Open transactions by status", "إنجاز الموظفين": "Staff performance", "أعلى الخدمات أتعاباً في الفترة": "Top services by fees in the period", "أكبر المبالغ المستحقة على العملاء": "Largest amounts owed by clients", "المفتوحة": "Open", "المتأخرة": "Overdue", "المنجزة": "Done", "الكل": "All", "كل الموظفين": "All staff", "غير مكلّف بعد": "Not assigned yet", "كل الأعمال": "All work", "المهام": "Tasks", "مهمة جديدة": "New task", "عبء العمل على كل موظف": "Workload per employee", "المالية: التحصيل والمصروفات": "Finance: collection and expenses", "تسجيل دفعة": "Record payment", "إضافة مصروف": "Add expense", "تصدير المدفوعات": "Export payments", "تصدير المصروفات": "Export expenses", "المستحق على العملاء": "Owed by clients", "المدفوعات المستلمة في الفترة": "Payments received in the period", "المصروفات في الفترة": "Expenses in the period", "الموظف المسؤول": "Assigned to", "نسبة الإنجاز": "Progress", "الرسوم والتحصيل": "Fees and collection", "مهمة": "Task", "المطلوب": "What is needed", "مثال: استلام أصل السجل من العميل": "Example: collect the original registration from the client", "الموعد": "Due", "العميل (اختياري)": "Client (optional)", "المعاملة (اختياري)": "Transaction (optional)", "الأولوية": "Priority", "عادية": "Normal", "عاجلة": "Urgent", "قيد التنفيذ": "In progress", "التفاصيل والملاحظات": "Details and notes", "حذف المهمة": "Delete task", "تسجيل دفعة من العميل": "Record a client payment", "المعاملة": "Transaction", "المبلغ (ر.ق)": "Amount (QAR)", "تاريخ الدفع": "Payment date", "طريقة الدفع": "Payment method", "نقداً": "Cash", "تحويل بنكي": "Bank transfer", "بطاقة": "Card", "شيك": "Cheque", "رقم السند أو المرجع (اختياري)": "Receipt or reference no. (optional)", "يُنشأ تلقائياً إن تُرك فارغاً": "Created automatically if left empty", "ملاحظة": "Note", "حفظ وطباعة سند القبض": "Save and print the receipt", "مصروف": "Expense", "البند": "Item", "رسوم حكومية مدفوعة عن العميل": "Government fees paid for a client", "رواتب": "Salaries", "إيجار": "Rent", "مواصلات": "Transport", "اتصالات وإنترنت": "Phone and internet", "أدوات ومستلزمات": "Tools and supplies", "تسويق": "Marketing", "التاريخ": "Date", "المعاملة المرتبطة (اختياري)": "Related transaction (optional)", "تظهر الألوان المحفوظة لكل زوار الموقع وفي «حسابي» ولوحة الإدارة.": "Saved colours appear for every visitor, in My account and in this dashboard.", "ألوان جاهزة": "Ready palettes", "ألوان من اختيارك": "Your own colours", "اللون الأساسي (الشريط العلوي والأزرار)": "Main colour (top bar and buttons)", "لون التمييز (الإبراز والعلامات)": "Accent colour (highlights and tags)", "معاينة": "Preview", "منجز لخدمات الأعمال": "Munjiz Business Services", "الخدمات · الباقات · حسابي": "Services · Packages · My account", "اطلب الخدمة": "Request the service", "الأكثر طلباً": "Most requested", "نص تجريبي يوضح شكل الصفحة بالألوان المختارة.": "Sample text showing the page in the chosen colours.", "حفظ الألوان للموقع": "Save the colours for the site", "الرجوع إلى ألوان منجز الافتراضية": "Back to Munjiz’s default colours", "توزيع العمل وتكليف الموظفين": "Work distribution and assigning staff", "دفعة": "Payment", "الإنجاز": "Progress", "المسؤول": "Assigned to", "الإجمالي": "Total", "المدفوع": "Paid", "المتبقي": "Balance", "الرقم": "No.", "التسجيل": "Recorded", "رقم العميل": "Client no.", "رقم المعاملة": "Transaction no.", "المبلغ": "Amount", "رقم السند": "Receipt no.", "سجّلها": "Recorded by", "سجّله": "Recorded by"});
// required documents: the catalogue lists them in the same order in both languages
try{const D=window.DETAILS||{};Object.keys(D).forEach(c=>{const a=((D[c]||{}).ar||{}).docs,e=((D[c]||{}).en||{}).docs;if(Array.isArray(a)&&Array.isArray(e)&&a.length===e.length)a.forEach((t,i)=>{if(!W[t])W[t]=e[i]})})}catch(e){}
const P=[ // patterns: Arabic text with numbers, names or ids → English
[/^الموظف (\S+) حدّث بيانات دخوله$/,(m,u)=>`Staff member ${u} updated their sign-in`],
[/^دفعة ([\d.,]+) ر\.ق \((.+?)\) · سند (\S+)$/,(m,n,w,r)=>`Payment ${n} QAR (${tr(w)}) · receipt ${r}`],
[/^تسجيل دفعة ([\d.,]+) ر\.ق · (.+?) · المعاملة (\S+) \((.+)\)$/,(m,n,w,t,l)=>`Payment recorded: ${n} QAR · ${tr(w)} · transaction ${t} (${tr(l)})`],
[/^تكليف (\S+) بـ(معاملة|مهمة|طلب) (\S+) \((.+)\)$/,(m,u,w,id,l)=>`${u} assigned to ${({'معاملة':'transaction','مهمة':'task','طلب':'request'})[w]} ${id} (${tr(l)})`],
[/^(معاملة|مهمة|طلب) (\S+) \((.+?)\): الإنجاز (\d+)%(.*)$/,(m,w,id,l,n,r)=>`${({'معاملة':'Transaction','مهمة':'Task','طلب':'Request'})[w]} ${id} (${tr(l)}): progress ${n}%${r}`],
[/^ألوان الموقع: (.+)$/,(m,x)=>`Site colours: ${tr(x)}`],
[/^(-?[\d,.]+) ر\.ق$/,(m,n)=>`${n} QAR`],
[/^(.+) \(([A-Z]{2}-\d{2})\)( × \d+)?$/,(m,n,c,q)=>`${CODE[c]||tr(n)} (${c})${q||''}`],
[/^(.+) · ([\d,]+)$/,(m,n,p)=>W[n]?`${W[n]} · ${p}`:m],
[/^الدوام (.+)$/,(m,x)=>`Shift ${x}`],
[/^(.+): (\d{4}-\d\d-\d\d) إلى (\d{4}-\d\d-\d\d)$/,(m,n,a,b)=>`${n}: ${a} to ${b}`],
[/^متأخرة (-?\d+) يوم$/,(m,n)=>`${n} day${n==1?'':'s'} late`],
[/^· تنتهي بعد (-?\d+) يوم$/,(m,n)=>`· expires in ${n} day${n==1?'':'s'}`],
[/^· باقة (.+?) · تنتهي بعد (-?\d+) يوم$/,(m,p,n)=>`· ${tr(p)} package · ends in ${n} day${n==1?'':'s'}`],
[/^· (\d+) رسالة ·(.*)$/,(m,n,r)=>`· ${n} message${n==1?'':'s'} ·${r}`],
[/^تحويل الطلب (\S+) إلى (\d+) معاملة$/,(m,id,n)=>`Request ${id} converted to ${n} transactions`],
[/^أُنشئت (\d+) معاملة$/,(m,n)=>`${n} transaction${n==1?'':'s'} created`],
[/^فتح الملف الكامل لـ (.+)$/,(m,n)=>`Open the full file of ${n}`],
[/^(.*) · الإصدار (\S+)$/,(m,d,v)=>`${docs(d)} · version ${v}`],
[/^(.*) · وقّع باسم «(.+)» · (.*)$/,(m,d,n,s)=>`${d} · signed as “${n}” · ${src(s)}`],
[/^تم الحفظ\. أرسل للعميل: (.+)$/,(m,x)=>`Saved. Send the client: ${x}`],
[/^تم الحفظ\. أرسل للموظف: (.+)$/,(m,x)=>`Saved. Send the staff member: ${x}`],
[/^تعديل الموظف (.+)$/,(m,x)=>`Edit staff member ${x}`],
[/^جزئية \((\d+) من (\d+)\)$/,(m,a,b)=>`Partial (${a} of ${b})`],
[/^· الدوام (.+)$/,(m,x)=>`· shift ${x}`],
[/^المعاملة (\S+)$/,(m,x)=>`Transaction ${x}`],
[/^رقم الطلب لدى الجهة: (.+)$/,(m,x)=>`Authority reference: ${x}`],
[/^تاريخ انتهاء المستند: (.+)$/,(m,x)=>`Document expiry: ${x}`],
[/^أُرسل التقرير إلى (.+)$/,(m,x)=>`Report sent to ${x}`],
[/^تعذر الإرسال: (.*)$/,(m,x)=>`Could not send: ${tr(x)}`],[/^تعذر الحفظ: (.*)$/,(m,x)=>`Could not save: ${tr(x)}`],
[/^(\d+) جلسات$/,(m,n)=>`${n} sessions`],
// activity and log lines written by the server
[/^إضافة (معاملة|عميل|طلب|ملف): (.+?)( · (.+))?$/,(m,w,l,_,s)=>`Added ${({'معاملة':'transaction','عميل':'client','طلب':'request','ملف':'file'})[w]}: ${tr(l)}${s?' · '+tr(s):''}`],
[/^تعديل (معاملة|عميل|طلب|ملف) (\S+) \((.+)\)$/,(m,w,id,l)=>`Edited ${({'معاملة':'transaction','عميل':'client','طلب':'request','ملف':'file'})[w]} ${id} (${tr(l)})`],
[/^(معاملة|عميل|طلب|ملف) (\S+) \((.+)\): (.*) ← (.+)$/,(m,w,id,l,a,b)=>`${({'معاملة':'Transaction','عميل':'Client','طلب':'Request','ملف':'File'})[w]} ${id} (${tr(l)}): ${tr(a)||'—'} → ${tr(b)}`],
[/^رد على العميل: (.*)$/,(m,x)=>`Reply to the client: ${x}`],[/^رفع ملف: (.+)$/,(m,x)=>`Uploaded file: ${x}`],[/^رفع ملف للعميل: (.+)$/,(m,x)=>`File uploaded for the client: ${x}`],
[/^بريد للعميل: (.+)$/,(m,x)=>`Email to the client: ${x}`],[/^حساب العميل: (.+)$/,(m,x)=>`Client account: ${tr(x.replace(/ · كلمة مرور جديدة$/,''))}${/كلمة مرور جديدة/.test(x)?' · new password':''}`],
[/^إظهار كلمة مرور بوابة: (.+)$/,(m,x)=>`Portal password revealed: ${x}`],[/^حذف (.+)$/,(m,x)=>`Deleted ${tr(x)}`],
[/^إنشاء حساب على الموقع: (\S+)( \(بانتظار التفعيل\))?$/,(m,u,p)=>`Website account created: ${u}${p?' (waiting for activation)':''}`],
[/^العميل غيّر كلمة المرور$/,()=>'The client changed the password'],[/^العميل عيّن كلمة مرور جديدة برمز البريد$/,()=>'The client set a new password with an email code'],
[/^طلب العميل رمز استعادة كلمة المرور$/,()=>'The client asked for a password reset code'],[/^رد على العميل من المراسلات( \(أُرسل بالبريد أيضاً\))?$/,(m,e)=>`Reply to the client from Messages${e?' (also emailed)':''}`],
[/^رسالة من العميل$/,()=>'Message from the client'],
[/^(.+) ← (.+)$/,(m,a,b)=>`${tr(a)} → ${tr(b)}`],
[/^(.+): (.+)$/,(m,a,b)=>W[a]?`${W[a]}: ${tr(b)}`:m],
];
// accounting, HR, period close and the services editor
Object.assign(W,{
"أرصدة الإجازات السنوية لهذه السنة": "Annual leave balances for this year",
"أرصدة العملاء": "Client balances",
"أسبوعي": "Weekly",
"أصول": "Assets",
"أعمار الديون": "Receivables ageing",
"أعمار الديون على العملاء": "Ageing of client receivables",
"إجازاتي وراتبي": "My leave and salary",
"إجازة": "Leave",
"إخفاء كل القسم": "Hide the whole section",
"إرسال الطلب": "Send request",
"إضافة حساب": "Add account",
"إضافة خدمة": "Add service",
"إضافة سطر": "Add line",
"إظهار كل القسم": "Show the whole section",
"إعداد رواتب الشهر": "Prepare this month's payroll",
"إقفال": "Close",
"إقفال الفترات وسجل التدقيق": "Period close and audit trail",
"إقفال الفترة المالية": "Close financial period",
"إقفال حتى": "Close up to",
"إيرادات": "Revenue",
"احفظ نسخة من القائمة كلها في ملف، أو استرجع نسخة سابقة، أو عد إلى القائمة الأصلية للموقع.": "Save a copy of the whole list to a file, restore an earlier copy, or return to the site's original list.",
"اسم الحساب بالإنجليزية": "Account name in English",
"اسم الحساب بالعربية": "Account name in Arabic",
"اسم الخدمة أو رمزها": "Service name or code",
"اكتب الموازنة السنوية لكل حساب إيرادات أو مصروفات. يُقارن الفعلي من بداية السنة حتى اليوم ": "Enter the annual budget for each revenue or expense account. Actual figures from the start of the year to date are compared …",
"اكتب الموازنة السنوية لكل حساب إيرادات أو مصروفات. يُقارن الفعلي من بداية السنة حتى اليوم": "Enter the annual budget for each revenue or expense account. Actual figures from the start of the year to date are compared …",
"اكتب الموازنة السنوية لكل حساب إيرادات أو مصروفات. يُقارن الفعلي من بداية السنة حتى اليوم بالموازنة المتناسبة مع الأشهر المنقضية.": "Enter the annual budget for each revenue or expense account. Actual figures from the start of the year to date are compared with the budget prorated for the months elapsed.",
"الأتعاب حسب الجهة الحكومية": "Fees by government authority",
"الإجازات": "Leave",
"الإجازة السنوية (أيام)": "Annual leave (days)",
"الإقفال وسجل التدقيق": "Period close and audit trail",
"الاسم بالإنجليزية": "Name in English",
"الاسم بالعربية": "Name in Arabic",
"البدلات الشهرية (ر.ق)": "Monthly allowances (QAR)",
"البنك": "Bank",
"البيان": "Description",
"التالي": "Next",
"التحصيل حسب طريقة الدفع": "Collections by payment method",
"التدفقات النقدية": "Cash flow",
"التقارير الدورية": "Periodic reports",
"التقارير المالية": "Financial reports",
"التقييمات": "Evaluations",
"التلقائية": "Automatic",
"الجنسية": "Nationality",
"الجهات": "Authorities",
"الجهة أو المجال": "Authority or field",
"الحضور وحسابات الدخول": "Attendance and sign-in accounts",
"الخدمات الحكومية": "Government services",
"الخدمات والأسعار": "Services and prices",
"الدراسات والاستشارات": "Studies and consulting",
"الراتب الأساسي (ر.ق)": "Basic salary (QAR)",
"الرمز": "Code",
"الرمز (حرفان)": "Code (two letters)",
"الرواتب": "Payroll",
"السابق": "Previous",
"السعر (ر.ق)": "Price (QAR)",
"السعر السنوي (ر.ق)": "Annual price (QAR)",
"السعر الشهري (ر.ق)": "Monthly price (QAR)",
"السعر يبدأ من («من»)": "Price starts from (“from”)",
"السنة": "Year",
"الشهر": "Month",
"الصندوق (نقداً)": "Cash box (cash)",
"العربية": "Arabic",
"العودة إلى القائمة الأصلية": "Return to the original list",
"القسم": "Section",
"القيود اليومية": "Journal entries",
"المبالغ غير المحصّلة مصنفة حسب عمر المعاملة من تاريخ إنشائها.": "Uncollected amounts, grouped by the age of each transaction since it was created.",
"المدة التقريبية بالإنجليزية": "Approximate duration in English",
"المدة التقريبية بالعربية": "Approximate duration in Arabic",
"المرجع (اختياري)": "Reference (optional)",
"المركز المالي": "Financial position",
"المزايا بالإنجليزية (سطر لكل ميزة)": "Benefits in English (one per line)",
"المزايا بالعربية (سطر لكل ميزة)": "Benefits in Arabic (one per line)",
"المستندات المطلوبة بالإنجليزية (سطر لكل مستند)": "Required documents in English (one per line)",
"المستندات المطلوبة بالعربية (سطر لكل مستند)": "Required documents in Arabic (one per line)",
"المصروفات": "Expenses",
"المصروفات حسب البند": "Expenses by category",
"الملخص الشهري": "Monthly summary",
"الموارد البشرية (الإجازات والرواتب والتقييمات)": "Human resources (leave, payroll and evaluations)",
"الموازنة مقابل الفعلي": "Budget vs actual",
"الموازنة والفعلي": "Budget and actual",
"الوحدة بالإنجليزية": "Unit in English",
"الوحدة بالعربية": "Unit in Arabic",
"اليدوية": "Manual",
"باقات الشركات الشهرية": "Monthly company packages",
"باقة شهرية": "Monthly package",
"بانتظار الموافقة": "Waiting for approval",
"بحث": "Search",
"بحث باسم العميل": "Search by client name",
"بحث بالعميل أو رقم السند أو المعاملة": "Search by client, receipt number or transaction",
"بداية العقد": "Contract start",
"بدون راتب": "Unpaid",
"بعد الإقفال لا يمكن إضافة أو تعديل أو حذف أي دفعة أو مصروف أو قيد بتاريخ يقع في الفترة الم": "After closing, no payment, expense or entry dated within the closed period can be added, edited or deleted …",
"بعد الإقفال لا يمكن إضافة أو تعديل أو حذف أي دفعة أو مصروف أو قيد بتاريخ يقع في الفترة المقفلة. الإقفال للمدير فقط.": "After closing, no payment, expense or entry dated within the closed period can be added, edited or deleted. Only the manager can close a period.",
"تحت التجربة": "On probation",
"تحديد الكل": "Select all",
"تراجع عن التعديلات": "Undo changes",
"تسجيل إجازة لموظف": "Record leave for an employee",
"تشمل كل الخدمات الحكومية (لا الرئيسية فقط)": "Includes all government services (not only the main ones)",
"تقييم الموظفين": "Staff evaluations",
"تقييم جديد": "New evaluation",
"تقييم موظف": "Evaluate an employee",
"تقييماتي": "My evaluations",
"تنزيل نسخة (JSON)": "Download a copy (JSON)",
"توزيع المهام": "Task distribution",
"تُرحَّل الدفعات والمصروفات والرواتب إلى الحسابات تلقائياً. الأرصدة هنا من بداية التشغيل حت": "Payments, expenses and salaries are posted to the accounts automatically. Balances here run from the start of operations …",
"تُرحَّل الدفعات والمصروفات والرواتب إلى الحسابات تلقائياً. الأرصدة هنا من بداية التشغيل حتى اليوم.": "Payments, expenses and salaries are posted to the accounts automatically. Balances here run from the start of operations to today.",
"جهة": "Authority",
"حتى تاريخ": "As of date",
"حجم المنشأة بالإنجليزية": "Company size in English",
"حجم المنشأة بالعربية": "Company size in Arabic",
"حساب في الدليل": "Account in the chart",
"حفظ التقييم": "Save evaluation",
"حفظ القيد": "Save entry",
"حفظ الموازنة": "Save budget",
"حفظ ونشر": "Save and publish",
"حقوق الملكية": "Equity",
"خدمة": "Service",
"خدمة رئيسية (ضمن الباقات)": "Main service (included in packages)",
"خصم الخدمات الإضافية (%)": "Discount on additional services (%)",
"خصوم": "Liabilities",
"دائن": "Credit",
"دليل الحسابات": "Chart of accounts",
"دوام جزئي": "Part-time",
"دوام كامل": "Full-time",
"دُفع من": "Paid from",
"ربع سنوي": "Quarterly",
"رصيدي": "My balance",
"رقم الحساب": "Account number",
"سجل التدقيق المالي": "Financial audit trail",
"سندات القبض": "Receipts",
"سنوي": "Annual",
"سنوية": "Annual",
"شهري": "Monthly",
"طارئة": "Emergency",
"طباعة": "Print",
"طباعة أو PDF": "Print or PDF",
"طلب إجازة": "Request leave",
"طلبات إجازاتي": "My leave requests",
"ظاهرة للعملاء": "Shown to clients",
"عدد الخدمات شهرياً": "Services per month",
"عربي": "Arabic",
"عليهم مبالغ": "Owing",
"عن الخدمة بالإنجليزية": "About the service in English",
"عن الخدمة بالعربية": "About the service in Arabic",
"فتح الفترات المالية المقفلة": "Reopen closed financial periods",
"فتح كل الفترات": "Reopen all periods",
"في تاريخ": "As of",
"قائمة التدفقات النقدية": "Cash flow statement",
"قائمة الدخل": "Income statement",
"قائمة الدخل (الأرباح والخسائر)": "Income statement (profit and loss)",
"قائمة المركز المالي": "Balance sheet",
"قيد يدوي": "Manual entry",
"كل البنود": "All categories",
"كل الطلبات": "All requests",
"كل العملاء": "All clients",
"كل القيود": "All entries",
"لكل معاملة: الرسوم الحكومية المطلوبة من العميل، وما دفعه المكتب فعلاً للجهة (المصروفات من ": "For each transaction: the government fees charged to the client, and what the office actually paid the authority (expenses from …",
"لكل معاملة: الرسوم الحكومية المطلوبة من العميل، وما دفعه المكتب فعلاً للجهة (المصروفات من": "For each transaction: the government fees charged to the client, and what the office actually paid the authority (expenses from …",
"لكل معاملة: الرسوم الحكومية المطلوبة من العميل، وما دفعه المكتب فعلاً للجهة (المصروفات من بند «رسوم حكومية مدفوعة عن العميل» المرتبطة بالمعاملة). الفرق الموجب يعني أن على المكتب دفعه للجهة، والسالب أن المكتب دفع أكثر مما طُلب.": "For each transaction: the government fees charged to the client, and what the office actually paid the authority (expenses under “Government fees paid for the client” linked to the transaction). A positive difference means the office still owes the authority; a negative one means the office paid more than was charged.",
"للمشروع": "For the project",
"مؤقت": "Temporary",
"ما تحفظه هنا يظهر لزوار الموقع وفي «حسابي». الخدمة أو الجهة غير المحددة تُخفى عن العملاء و": "What you save here appears to site visitors and in “My account”. Any service or authority left unticked is hidden from clients and …",
"ما تحفظه هنا يظهر لزوار الموقع وفي «حسابي». الخدمة أو الجهة غير المحددة تُخفى عن العملاء وتبقى محفوظة لتعيد إظهارها متى شئت.": "What you save here appears to site visitors and in “My account”. Any service or authority left unticked is hidden from clients and stays saved, so you can show it again whenever you like.",
"ما نقوم به بالإنجليزية": "What we do in English",
"ما نقوم به بالعربية": "What we do in Arabic",
"مثال: إيداع رأس المال في البنك": "Example: capital deposited in the bank",
"مثال: الربع الرابع 2026": "Example: Q4 2026",
"مدين": "Debit",
"مرضية": "Sick",
"مرفوضة": "Rejected",
"مسيرات راتبي": "My payslips",
"مصروفات": "Expenses",
"ملاحظات وتوصيات": "Notes and recommendations",
"ملاحظة بالإنجليزية": "Note in English",
"ملاحظة بالعربية": "Note in Arabic",
"ملخص": "Summary",
"ملخص المراجعة": "Review summary",
"ملفات الموظفين والعقود": "Staff files and contracts",
"موافق عليها": "Approved",
"ميزان المراجعة": "Trial balance",
"نبذة بالإنجليزية": "Overview in English",
"نبذة بالعربية": "Overview in Arabic",
"نسخة احتياطية": "Backup",
"نصف سنوي": "Semi-annual",
"نهاية العقد": "Contract end",
"نوع التقرير": "Report type",
"نوع العقد": "Contract type",
"يومي": "Daily",
"يُنشأ لكل موظف مسير بالراتب الأساسي والبدلات من ملفه. عدّل الخصومات ثم اضغط «دفع». الراتب ": "A payslip is created for each employee with the basic salary and allowances from their file. Adjust deductions, then press “Pay” …",
"يُنشأ لكل موظف مسير بالراتب الأساسي والبدلات من ملفه. عدّل الخصومات ثم اضغط «دفع». الراتب": "A payslip is created for each employee with the basic salary and allowances from their file. Adjust deductions, then press “Pay” …",
"يُنشأ لكل موظف مسير بالراتب الأساسي والبدلات من ملفه. عدّل الخصومات ثم اضغط «دفع». الراتب المدفوع يُسجَّل مصروفاً تلقائياً ويُقفل.": "A payslip is created for each employee with the basic salary and allowances from their file. Adjust deductions, then press “Pay”. A paid salary is recorded as an expense automatically and locked.",
"مسودة": "Draft",
"مدفوع": "Paid",
"القيد": "journal entry",
"الراتب": "Salary",
"رواتب": "Salaries"
});
P.push(
// server log lines that name an English sheet (Payroll, Journal, Budget …) or an Arabic type the earlier patterns don't cover
[/^إضافة (Payroll|Journal|Budget|Coa|Leaves|Evals|Payments|Staff|مصروف|مهمة|طلب عميل): (.+?)( · (.+))?$/,(m,w,l,_,s)=>`Added ${({Payroll:'payroll',Journal:'journal entry',Budget:'budget',Coa:'account',Leaves:'leave',Evals:'evaluation',Payments:'payment',Staff:'staff member','مصروف':'expense','مهمة':'task','طلب عميل':'client request'})[w]}: ${tr(l)}${s?' · '+tr(s):''}`],
[/^(Payroll|Journal|Budget|Coa|Leaves|Evals|Payments|Staff) (\S+) \((.+?)\): (.+)$/,(m,w,id,l,s)=>`${w} ${id} (${tr(l)}): ${tr(s)}`],
[/^(مصروف|مهمة|طلب عميل) (\S+) \((.+?)\): (.+)$/,(m,w,id,l,s)=>`${({'مصروف':'Expense','مهمة':'Task','طلب عميل':'Client request'})[w]} ${id} (${tr(l)}): ${tr(s)}`],
[/^المسؤول (.+)$/,(m,x)=>`Assigned to ${x}`],
[/^إقفال الفترة المالية حتى (\d{4}-\d\d-\d\d)$/,(m,d)=>`Financial period closed up to ${d}`],
[/^راتب (\S+) (\d{4}-\d\d)$/,(m,u,mo)=>`Salary ${u} ${mo}`],
);

const docs=s=>s==='اتفاقية الخدمة، حدود المسؤولية، التفويض، البيانات والسرية'?'Service agreement, limitation of liability, authorization, data and confidentiality':s;
const src=s=>s.replace(/^إنشاء الحساب( عن (.+))?$/,(m,_,c)=>'Account created'+(c?' for '+c:'')).replace(/^التسجيل في الموقع$/,'Website registration');
function tr(s){if(!EN||s==null)return s;const t=String(s).replace(/\s+/g,' ').trim();if(!t||!/[؀-ۿ]/.test(t))return s;
  if(Object.prototype.hasOwnProperty.call(W,t))return W[t];
  for(const [re,fn] of P){const m=t.match(re);if(m){const r=fn(...m);if(r!==m[0])return r}}
  // a phrase between separator dots, or a list: translate the known parts, keep names and typed text
  const edge=t.match(/^([·\s]*)(.*?)([·\s]*)$/);if(edge&&(edge[1]||edge[3])&&edge[2]){const r=tr(edge[2]);if(r!==edge[2])return edge[1]+r+edge[3]}
  if(t.includes(' · ')){const parts=t.split(' · '),r=parts.map(x=>tr(x));if(r.some((x,i)=>x!==parts[i]))return r.join(' · ')}
  if(t.includes('، ')){const parts=t.split('، '),r=parts.map(x=>tr(x));if(r.every((x,i)=>x!==parts[i]))return r.join(', ')}
  return s}
// text nodes keep their surrounding spaces; only the words change
function fixText(n){const v=n.nodeValue;if(!v||!/[؀-ۿ]/.test(v))return;const p=n.parentNode;if(p&&(p.closest&&p.closest('.basmala,textarea,[data-keep]')))return;
  const t=tr(v);if(t!==v){if(p&&p.tagName==='OPTION'&&!p.hasAttribute('value'))p.setAttribute('value',v.trim());const lead=v.match(/^\s*/)[0],trail=v.match(/\s*$/)[0];n.nodeValue=lead+String(t).trim()+trail}}
const ATTR=['placeholder','title','aria-label'];
function fixEl(el){ATTR.forEach(a=>{const v=el.getAttribute&&el.getAttribute(a);if(v&&/[؀-ۿ]/.test(v)){const t=tr(v);if(t!==v)el.setAttribute(a,t)}})}
function walk(root){if(root.nodeType===3){fixText(root);return}if(root.nodeType!==1)return;if(root.closest&&root.closest('.basmala'))return;fixEl(root);
  const it=document.createTreeWalker(root,NodeFilter.SHOW_ELEMENT|NodeFilter.SHOW_TEXT);let n;while((n=it.nextNode())){if(n.nodeType===3)fixText(n);else fixEl(n)}}

function start(){
  // language button in the header
  const hdr=document.querySelector('header.top .wrap');
  if(hdr&&!document.getElementById('langBtn')){const box=document.createElement('div');box.className='lsw notranslate';box.dataset.keep='';box.setAttribute('role','group');box.setAttribute('aria-label',EN?'Language':'اللغة');
    const cur=`<a aria-current="true" lang="${EN?'en':'ar'}" data-keep><span class="lfull">${EN?'English':'العربية'}</span><span class="lshort">${EN?'EN':'عربي'}</span></a>`;
    box.innerHTML='<svg class="lglobe" width="16" height="16" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9.5" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M2.5 12h19M12 2.5c3 3.2 3 15.8 0 19M12 2.5c-3 3.2-3 15.8 0 19" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>';
    const b=document.createElement('a');b.href='#';b.id='langBtn';b.lang=EN?'ar':'en';b.dataset.keep='';b.innerHTML=EN?'<span class="lfull">العربية</span><span class="lshort">عربي</span>':'<span class="lfull">English</span><span class="lshort">EN</span>';
    b.onclick=e=>{e.preventDefault();try{localStorage.setItem(KEY,EN?'ar':'en')}catch(err){}const u=new URL(location.href);u.searchParams.delete('lang');location.href=u.pathname+u.search};
    if(EN){box.insertAdjacentHTML('beforeend',cur);box.insertBefore(b,box.lastChild)}else{box.insertAdjacentHTML('beforeend',cur);box.appendChild(b)}
    hdr.appendChild(box)}
  if(!EN)return;
  document.documentElement.lang='en';document.documentElement.dir='ltr';document.title=tr(document.title);
  document.querySelectorAll('a[href="portal.html"]').forEach(a=>a.setAttribute('href','en/portal.html'));
  walk(document.body);
  new MutationObserver(ms=>{for(const m of ms){if(m.type==='characterData')fixText(m.target);else if(m.type==='attributes')fixEl(m.target);else m.addedNodes.forEach(walk)}})
    .observe(document.body,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:ATTR});
}
window.CRM_I18N={en:EN,tr,
  // CSV exports: translate header labels and fixed values, keep typed data as is
  csv(text){if(!EN)return text;const bom=text[0]==='\ufeff'?'\ufeff':'';return bom+text.slice(bom.length).split('\r\n').map(line=>line.split(',').map(c=>{const q=/^".*"$/.test(c),v=q?c.slice(1,-1).replace(/""/g,'"'):c;const t=tr(v);return t===v?c:(q?'"'+String(t).replace(/"/g,'""')+'"':t)}).join(',')).join('\r\n')}};
start();
})();

// تفاصيل كل خدمة: المستندات المطلوبة والمدة التقريبية وما تستلمه. المدد تقديرية وتحددها الجهة المختصة.
(function(){
const QID='صورة البطاقة الشخصية',PP='صورة الجواز',CR='السجل التجاري وبطاقة المنشأة',ON='منجز تقدم الطلب إلكترونياً. إن احتاج الطلب مراجعة شخصية أو متابعة ميدانية نخبرك بذلك ونسعّره قبل البدء.';
const P=(docs,time,out,note)=>({ar:{docs,time,out,note:note||ON}});
window.DETAILS={
 'MI-01':P([QID,PP,'نتيجة الفحص الطبي إن طُلبت'],'من يوم إلى 3 أيام عمل','إيصال التجديد والإقامة الإلكترونية'),
 'MI-02':P([PP+' الجديد',QID],'من يوم إلى 3 أيام عمل','تأكيد تحديث البيانات'),
 'MI-03':P([QID+' إن وُجدت',PP,'بلاغ الفقد إن طُلب'],'من يوم إلى 3 أيام عمل','إيصال الطلب وموعد الاستلام'),
 'MI-04':P(['جوازات الزوار','عقد الزواج أو شهادات الميلاد','شهادة الراتب أو عقد العمل'],'من 3 إلى 10 أيام عمل','التأشيرة الإلكترونية'),
 'MI-05':P([CR,'بطاقة المفوض'],'من يوم إلى 3 أيام عمل','بطاقة المنشأة المجددة'),
 'MI-06':P(['الرقم الشخصي أو رقم المنشأة'],'في نفس اليوم','إيصال السداد'),
 'MC-01':P(['الاسم المقترح وبديلان',QID],'من يوم إلى يومين','موافقة حجز الاسم'),
 'MC-02':P([CR,'بيانات الدخول أو تفويض المالك'],'من يوم إلى 3 أيام عمل','مستخرج السجل المجدد'),
 'MC-03':P(['الرخصة الحالية','عقد إيجار موثق ساري'],'من يوم إلى 5 أيام عمل','الرخصة المجددة'),
 'MC-04':P(['رقم السجل التجاري'],'في نفس اليوم','المستخرج PDF'),
 'MC-05':P(['قائمة الأصناف والأسعار',CR],'من يوم إلى 3 أيام عمل','تأكيد التسجيل'),
 'ML-01':P(['بيانات الموظف والراتب والمهنة',CR],'في نفس اليوم','العقد الموثق'),
 'ML-02':P([CR,'البيانات الجديدة'],'من يوم إلى 3 أيام عمل','تأكيد التحديث'),
 'MH-01':P([QID+' أو '+PP],'في نفس اليوم','موعد الفحص والتذكير'),
 'MH-02':P([QID],'من يوم إلى 3 أيام عمل','البطاقة الصحية'),
 'MH-03':P([QID,'صورة شخصية'],'من 3 إلى 7 أيام عمل','الشهادة الصحية'),
 'MB-01':P(['عقد الإيجار موقعاً','بطاقة المالك والمستأجر'],'من يوم إلى 3 أيام عمل','شهادة توثيق العقد'),
 'TR-01':P(['الاستمارة الحالية','الفحص الفني والتأمين الساريان'],'في نفس اليوم','الاستمارة المجددة'),
 'TR-02':P([QID,'نتيجة فحص النظر إن طُلبت'],'من يوم إلى 3 أيام عمل','الرخصة المجددة'),
 'TR-03':P(['الرقم الشخصي أو رقم اللوحة'],'في نفس اليوم','إيصال السداد وشهادة الخلو'),
 'UT-01':P(['رقم العداد',QID],'من يوم إلى 3 أيام عمل','براءة الذمة'),
 'UT-02':P(['عقد الإيجار الموثق',QID,'شهادة الإنجاز للمباني الجديدة'],'من 2 إلى 5 أيام عمل','رقم الطلب وموعد التركيب'),
 'JS-01':P(['المستند المراد ترجمته'],'من يوم إلى 3 أيام عمل','الترجمة المعتمدة','الترجمة يقوم بها مكتب ترجمة مرخص.'),
 'JS-02':P(['أصل المستند'],'من يوم إلى 3 أيام عمل','المستند المصدق'),
 'OF-01':P(['البيانات المطلوبة في النموذج'],'في نفس اليوم','النموذج معبأ ومطبوع أو PDF','خدمة مكتبية لا تشمل تقديم الطلب.'),
 'OF-02':P([QID,'رقم الجوال المسجل'],'في نفس اليوم','حساب مفعل وشرح مختصر','لا نحتفظ بكلمات المرور بعد إنشاء الحساب.'),
 'OF-03':P(['نوع الخدمة والجهة'],'في نفس اليوم','تفاصيل الموعد','خدمة مكتبية لا تشمل الحضور معك.'),
 'OF-04':P(['المستندات الأصلية أو صورها'],'من يوم إلى يومين','ملف رقمي مرتب','نعيد الأصول في نفس اليوم.'),
 'OF-05':P(['صور مستنداتك أو بياناتها'],'التسجيل في يوم واحد','جدول المواعيد وتذكيرات طوال السنة','خدمة تذكير فقط، والتجديد نفسه يُطلب منفصلاً.'),
 'OF-06':P(['عنوان الاستلام والتسليم'],'في نفس اليوم أو اليوم التالي','إيصال استلام وتسليم موقع','داخل الدوحة فقط.'),
 'AU-01':P(['صورة البطاقة الشخصية سارية','رقم الجوال المسجل في توثيق أو مطراش','السجل التجاري إن كانت المشاركة باسم شركة'],'من يوم إلى يومي عمل','حساب مفعل في منصة المزاد وشرح مكتوب للشروط','مبلغ التأمين ورسوم المزاد تُدفع مباشرة للجهة المنظمة بحسب شروطها، وهي منفصلة عن أتعابنا.'),
 'AU-02':P(['صورة البطاقة الشخصية سارية','رابط المزاد أو رقم الصنف','الحد الأعلى الذي تقرره للمزايدة'],'حسب موعد المزاد المعلن','ملف مشاركة جاهز وتذكير بالموعد','لا يضمن أحد الفوز في أي مزاد. قرار المزايدة ومبلغها لك وحدك، والتأمين والرسوم تُدفع للجهة المنظمة.'),
 'AU-03':P(['إشعار الترسية أو نتيجة المزاد','صورة البطاقة الشخصية أو السجل التجاري'],'من 3 إلى 10 أيام عمل حسب الجهة','إيصالات السداد وطلب النقل أو الاسترداد مقدم','قيمة الصنف ورسوم النقل والتسجيل تُدفع للجهات المختصة، ونطلعك عليها قبل السداد.'),
 'AU-04':P([CR+' وترخيص المزاد','قائمة الأصناف وصورها','موعد المزاد ورابطه'],'من يوم إلى يومي عمل','نص الإعلان و4 تصاميم جاهزة للنشر','لشركات ومنظمي المزادات. لا نضمن عدد المزايدين أو سعر البيع.'),
 'AU-05':P([CR+' وترخيص المزاد','صلاحية النشر على حسابات الشركة','الميزانية الإعلانية إن وُجدت'],'أسبوع قبل المزاد','منشورات وإعلان منشور وتقرير مختصر','الميزانية الإعلانية تُدفع للمنصات مباشرة ومنفصلة عن أتعابنا. الرسائل تُرسل فقط لعملاء وافقوا على استقبالها.'),
 'PK-01':P([CR,'الرخصة الحالية','عقد الإيجار'],'من 3 إلى 7 أيام عمل','سجل ورخصة وبطاقة منشأة مجددة'),
 'PK-02':P([PP+' الموظف','بيانات العقد',CR],'من 5 إلى 15 يوم عمل','عقد موثق وطلب إقامة مقدم وبطاقة صحية','تأشيرة العمل وحصة الاستقدام خارج هذه الحزمة.')
};
})();
// English: names, what we do, documents, time and result for each service, plus authority and package names.
(function(){
const D=window.DETAILS,QID='Copy of Qatar ID',PP='Copy of passport',CR='Commercial registration and establishment card';
const ON='Munjiz submits online. If the request needs an in-person visit or field follow-up, we tell you and price it before starting.';
const E={
 'MI-01':['Online residency renewal','Check validity, fill the Metrash2 request, pay the fee on your behalf, send the receipt',[QID,PP,'Medical result if required'],'1 to 3 working days','Renewal receipt and e-residency'],
 'MI-02':['Transfer new passport details to the residency','Fill the request, upload the passport copy, send confirmation',['Copy of the new passport',QID],'1 to 3 working days','Update confirmation'],
 'MI-03':['Replacement for a lost or damaged residency card','Submit the request, pay the fee on your behalf, tell you when to collect',[QID+' if available',PP,'Loss report if required'],'1 to 3 working days','Request receipt and collection date'],
 'MI-04':['Family visit visa request','Fill the request, upload documents, track status online',['Visitors’ passports','Marriage or birth certificates','Salary certificate or contract'],'3 to 10 working days','E-visa'],
 'MI-05':['Online establishment card renewal','Check the data, submit the renewal, send the e-card',[CR,'Authorised signatory card'],'1 to 3 working days','Renewed establishment card'],
 'MI-06':['Check and pay traffic or MOI violations','Look up by QID or establishment number, pay on your behalf, send the receipt',['QID or establishment number'],'Same day','Payment receipt'],
 'MC-01':['Trade name reservation','Search the name, submit the request, send the approval',['Proposed name and two alternatives',QID],'1 to 2 days','Name reservation approval'],
 'MC-02':['Online commercial registration renewal','Check validity, submit, pay the fee on your behalf, send the extract',[CR,'Login or owner’s authorisation'],'1 to 3 working days','Renewed CR extract'],
 'MC-03':['Online trade licence renewal','Submit the renewal with a valid lease, send the licence',['Current licence','Valid attested lease'],'1 to 5 working days','Renewed licence'],
 'MC-04':['CR extract or registration certificate','Request the extract online and send it',['CR number'],'Same day','Extract as PDF'],
 'MC-05':['Register or update product prices','Enter items and prices in the system, send confirmation',['List of items and prices',CR],'1 to 3 working days','Registration confirmation'],
 'ML-01':['Online employment contract attestation','Enter contract data, attest, send the copy',['Employee, salary and job details',CR],'Same day','Attested contract'],
 'ML-02':['Update establishment data at the Ministry of Labour','Update signatories, address or contacts',[CR,'The new details'],'1 to 3 working days','Update confirmation'],
 'MH-01':['Book the residency medical exam','Book the appointment, send details and a reminder',[QID+' or '+PP],'Same day','Appointment and reminder'],
 'MH-02':['Issue or renew the health card','Submit online, pay the fee on your behalf',[QID],'1 to 3 working days','Health card'],
 'MH-03':['Health certificate for food workers','Book the appointment, prepare the request, send the certificate',[QID,'Personal photo'],'3 to 7 working days','Health certificate'],
 'MB-01':['Attest a residential or commercial lease','Enter lease data, attest, send the certificate',['Signed lease','Landlord and tenant IDs'],'1 to 3 working days','Lease attestation certificate'],
 'TR-01':['Vehicle registration renewal','Confirm inspection and insurance, renew online, send the registration',['Current registration','Valid inspection and insurance'],'Same day','Renewed registration'],
 'TR-02':['Driving licence renewal','Submit online, pay the fee on your behalf',[QID,'Eye test if required'],'1 to 3 working days','Renewed licence'],
 'TR-03':['Pay traffic fines and get a clearance','Look up, pay on your behalf, send the certificate',['QID or plate number'],'Same day','Payment receipt and clearance'],
 'UT-01':['Kahramaa clearance','Submit the request, pay dues on your behalf, send the clearance',['Meter number',QID],'1 to 3 working days','Clearance certificate'],
 'UT-02':['Open or transfer electricity and water','Fill the request, upload documents, send the request number',['Attested lease',QID,'Completion certificate for new buildings'],'2 to 5 working days','Request number and installation date'],
 'JS-01':['Certified translation through a licensed office','Receive the document, translate at a licensed office, deliver',['The document to translate'],'1 to 3 working days','Certified translation','Translation is done by a licensed translation office.'],
 'JS-02':['Attest a document at the Ministry of Foreign Affairs','Book or submit online, deliver',['Original document'],'1 to 3 working days','Attested document'],
 'OF-01':['Fill in and print a government form','Fill the form accurately from your data, print or send as PDF',['The data the form asks for'],'Same day','Completed form, printed or PDF','Office service; does not include submitting the request.'],
 'OF-02':['Create government portal accounts','Create and link the account (National Authentication, Metrash2, Single Window), explain how to use it',[QID,'Registered mobile number'],'Same day','Active account and a short guide','We do not keep passwords after creating the account.'],
 'OF-03':['Book an appointment with a government office','Book the earliest available slot, send details',['Service and authority'],'Same day','Appointment details','Office service; does not include attending with you.'],
 'OF-04':['Organised digital document file','Scan, name and organise documents, deliver by link or USB',['Originals or copies'],'1 to 2 days','Organised digital file','Originals returned the same day.'],
 'OF-05':['Renewal date reminders','A schedule of all your documents and dates, WhatsApp reminder 30 days ahead',['Copies or details of your documents'],'Set up in one day','Schedule and reminders all year','Reminder service only; the renewal itself is ordered separately.'],
 'OF-06':['Document delivery within Doha','Pick up from you and deliver to the office, or the reverse',['Pick-up and delivery addresses'],'Same or next day','Signed pick-up and delivery receipt','Within Doha only.'],
 'AU-01':['Auction platform registration and deposit setup','Account set up via the National Authentication System or Metrash, auction terms explained, deposit payment method',['Copy of valid Qatar ID','Mobile number registered with the National Authentication System or Metrash','CR copy if bidding in a company name'],'1 to 2 working days','Active auction account and the terms in writing','The deposit and auction fees are paid directly to the organising authority under its terms, separately from our fee.'],
 'AU-02':['Help taking part in an auction','Auction date followed with a reminder, item terms reviewed, deposit prepared; bidding and its decision stay with you',['Copy of valid Qatar ID','Auction link or item number','Your maximum bid'],'According to the announced auction date','A ready participation file and a date reminder','Nobody can guarantee winning an auction. Bidding decisions and amounts are yours alone; deposits and fees are paid to the organiser.'],
 'AU-03':['After-auction procedures online','Price and fees paid to the organiser on your behalf, transfer request in your name, or deposit refund request if you did not win',['Award notice or auction result','Copy of Qatar ID or CR'],'3 to 10 working days depending on the authority','Payment receipts and the transfer or refund request submitted','The item price and transfer and registration fees are paid to the relevant authorities; we share them with you before payment.'],
 'AU-04':['Marketing content for an auction notice (for auction companies)','Notice text in Arabic and English, 3 post designs and a story, ready to publish',['CR and auction licence','Item list and photos','Auction date and link'],'1 to 2 working days','Notice text and 4 ready designs','For auction companies and organisers. Bidder numbers and sale prices are not guaranteed.'],
 'AU-05':['Publishing an auction notice and following it for a week (for auction companies)','Posting on the company accounts, a simple paid ad, WhatsApp messages to the company\'s opted-in clients, short report',['CR and auction licence','Posting access to the company accounts','Ad budget if any'],'One week before the auction','Posts, a live ad and a short report','The ad budget is paid to the platforms directly, separate from our fees. Messages go only to clients who agreed to receive them.'],
 'PK-01':['Annual shop renewal bundle','Online renewal of CR, licence and establishment card, plus lease attestation if needed',[CR,'Current licence','Lease'],'3 to 7 working days','Renewed CR, licence and establishment card'],
 'PK-02':['New employee bundle (online submission)','Contract attestation, medical exam booking, residency request, health card',['Employee passport','Contract details',CR],'5 to 15 working days','Attested contract, residency request submitted and health card','Work visa and recruitment quota are outside this bundle.']
};
Object.entries(E).forEach(([c,[name,inc,docs,time,out,note]])=>{D[c]=D[c]||{};D[c].en={name,inc,docs,time,out,note:note||ON}});
D._entities={MI:'Ministry of Interior (Metrash2)',MC:'Ministry of Commerce and Industry',ML:'Ministry of Labour',MH:'Health and medical exam',MB:'Ministry of Municipality',TR:'Traffic Department',UT:'Kahramaa and utilities',JS:'Translation and attestation',AU:'Auctions: bidding and marketing',OF:'Supporting office services',PK:'Service bundles'};
D._plans_en={basic:{name:'Munjiz Start',staff:'Shop or business up to 5 employees',feat:['5 services a month from those marked "In packages"','Renewal reminders included','Requests by WhatsApp with a receipt for every fee','10% off any extra service']},
 full:{name:'Munjiz Follow-up',staff:'Business up to 15 employees',feat:['12 services a month from those marked "In packages"','Renewal reminders included','Organised digital document file included','One document delivery a month included','15% off extra services and bundles']}};
})();

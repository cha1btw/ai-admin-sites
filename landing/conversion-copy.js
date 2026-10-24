(function () {
  var rows = [
    ['ПРИКЛАД ДЛЯ ВАШОЇ СПРАВИ','ПРИМЕР ДЛЯ ВАШЕГО ДЕЛА','AN EXAMPLE FOR YOUR BUSINESS','UN EJEMPLO PARA TU NEGOCIO','PRZYKŁAD DLA TWOJEJ FIRMY'],
    ['Ілюстрація розмови. Реальний запис тут не створюється.','Пример разговора. Реальная запись здесь не создаётся.','An illustrative conversation. No real appointment is created.','Conversación ilustrativa. No se crea una cita real.','Przykładowa rozmowa. Nie powstaje prawdziwa rezerwacja.'],
    ['Підібрати тариф','Подобрать тариф','Find my plan','Elegir mi plan','Dobierz plan'],
    ['ОБРАТИ ПРОСТІШЕ, НІЖ ЗДАЄТЬСЯ','ВЫБРАТЬ ПРОЩЕ, ЧЕМ КАЖЕТСЯ','CHOOSING IS EASIER THAN IT LOOKS','ELEGIR ES MÁS FÁCIL DE LO QUE PARECE','WYBÓR JEST PROSTSZY, NIŻ MYŚLISZ'],
    ['Який план потрібен саме вам?','Какой план нужен именно вам?','Which plan fits your needs?','¿Qué plan necesitas?','Który plan pasuje do Twoich potrzeb?'],
    ['Два запитання — і покажемо мінімальний план під ваші задачі.','Два вопроса — и покажем минимальный план под ваши задачи.','Two questions to find the smallest plan that fits your needs.','Dos preguntas para encontrar el plan mínimo que necesitas.','Dwa pytania, by znaleźć najniższy plan odpowiadający Twoim potrzebom.'],
    ['Скільки каналів хочете підключити?','Сколько каналов хотите подключить?','How many channels do you need?','¿Cuántos canales necesitas?','Ile kanałów chcesz podłączyć?'],
    ['Один месенджер','Один мессенджер','One messaging channel','Un canal de mensajería','Jeden komunikator'],
    ['Два або більше','Два или больше','Two or more','Dos o más','Dwa lub więcej'],
    ['Що потрібно помічнику?','Что нужно помощнику?','What should the assistant handle?','¿Qué debe hacer el asistente?','Czym ma zajmować się pomocnik?'],
    ['Текстові відповіді та запис','Текстовые ответы и запись','Text replies and bookings','Respuestas de texto y reservas','Odpowiedzi tekstowe i zapisy'],
    ['Аудіо, нагадування або аналітика','Аудио, напоминания или аналитика','Audio, reminders or analytics','Audio, recordatorios o analítica','Audio, przypomnienia lub analityka'],
    ['Передоплати, лист очікування або база знань','Предоплаты, лист ожидания или база знаний','Deposits, waitlist or knowledge base','Anticipos, lista de espera o base de conocimiento','Przedpłaty, lista oczekujących lub baza wiedzy'],
    ['Обрати цей план','Выбрать этот план','Choose this plan','Elegir este plan','Wybierz ten plan'],
    ['Це орієнтир. Сумісність CRM та обсяг налаштувань погодимо перед запуском.','Это ориентир. Совместимость CRM и объём настроек согласуем перед запуском.','This is a guide. We agree CRM compatibility and setup scope before launch.','Es una orientación. Acordamos compatibilidad del CRM y configuración antes del lanzamiento.','To wskazówka. Zgodność CRM i zakres konfiguracji uzgodnimy przed wdrożeniem.'],
    ['Почнімо','Начнём','Let’s start','Empecemos','Zacznijmy'],
    ['з вашої справи.','с вашего дела.','with your business.','por tu negocio.','od Twojej firmy.'],
    ['Підготуйте короткий запит і продовжте розмову в Telegram із @ZapysAI.','Подготовьте короткий запрос и продолжите разговор в Telegram с @ZapysAI.','Prepare a short enquiry and continue in Telegram with @ZapysAI.','Prepara una consulta y continúa en Telegram con @ZapysAI.','Przygotuj krótkie zapytanie i kontynuuj w Telegramie z @ZapysAI.'],
    ['Після заповнення покажемо текст запиту. У Telegram ви самі підтвердите його надсилання.','После заполнения покажем текст запроса. В Telegram вы сами подтвердите отправку.','Review your enquiry after filling in the form. You confirm sending it in Telegram.','Revisa tu consulta al completar el formulario. Confirmas el envío en Telegram.','Po wypełnieniu zobaczysz treść zapytania. Wysyłkę potwierdzasz samodzielnie w Telegramie.'],
    ['(обовʼязково)','(обязательно)','(required)','(obligatorio)','(wymagane)'],
    ['Додати деталі про бізнес','Добавить детали о бизнесе','Add business details','Añadir detalles del negocio','Dodaj szczegóły firmy'],
    ['Текст вашого запиту','Текст вашего запроса','Your enquiry text','Texto de tu consulta','Treść Twojego zapytania'],
    ['Відкрити Telegram','Открыть Telegram','Open Telegram','Abrir Telegram','Otwórz Telegram'],
    ['Скопіювати текст','Скопировать текст','Copy text','Copiar texto','Kopiuj tekst'],
    ['Дані залишаються у вашому браузері, доки ви не продовжите в Telegram. Не додавайте чутливу інформацію.','Данные остаются в вашем браузере, пока вы не продолжите в Telegram. Не добавляйте чувствительную информацию.','Your details stay in your browser until you continue in Telegram. Please avoid sensitive information.','Tus datos permanecen en tu navegador hasta que continúas en Telegram. No incluyas información sensible.','Dane pozostają w Twojej przeglądarce, dopóki nie przejdziesz do Telegrama. Nie dodawaj danych wrażliwych.']
  ];
  rows.forEach(function (row) { window.ZAPYS_I18N.push({uk:row[0],ru:row[1],en:row[2],es:row[3],pl:row[4]}); });
  window.ZAPYS_CONVERSION_COPY = {
    uk:{example:'Приклад діалогу',exampleFor:'Приклад для',recommended:'Мінімальний план під ваші задачі',chosen:'Ви обрали',industry:'Сфера',channels:'Канали',needs:'Задачі',one:'Один месенджер',many:'Два або більше',text:'Текст і запис',audio:'Аудіо, нагадування, аналітика',advanced:'Передоплати, лист очікування, база знань',lite:'Для текстових діалогів в одному месенджері достатньо Lite.',medium:'Аудіоповідомлення, нагадування й базова аналітика починаються з Medium.',proChannels:'Кілька месенджерів разом доступні у Pro.',proAdvanced:'Передоплати, лист очікування та персональна база знань входять у Pro.',month:'місяць',year:'рік',prepare:'Підготувати заявку',intro:'Вітаю! Хочу спробувати ZapysAI протягом 14 днів.',name:'Імʼя',contact:'Контакт',business:'Бізнес',service:'Послуга',comment:'Коментар',plan:'Тариф',help:'Потрібна допомога з вибором тарифу',price:'Вартість',billing:'Оплата',ready:'Запит підготовлено, але ще не надіслано. Відкрийте чат @{contact} у Telegram і натисніть «Надіслати».',copied:'Текст скопійовано. Надішліть його у чат @{contact}.',manual:'Не вдалося скопіювати автоматично. Виділіть і скопіюйте текст вище.',apiRoute:'Заявку буде надіслано команді ZapysAI через цю форму.',apiPrivacy:'Надсилаючи заявку, ви погоджуєтеся на звʼязок за вказаним контактом.',apiIntro:'Залиште контакт, і ми напишемо протягом робочого дня.',submit:'Надіслати заявку'},
    ru:{example:'Пример диалога',exampleFor:'Пример для',recommended:'Минимальный план под ваши задачи',chosen:'Вы выбрали',industry:'Сфера',channels:'Каналы',needs:'Задачи',one:'Один мессенджер',many:'Два или больше',text:'Текст и запись',audio:'Аудио, напоминания, аналитика',advanced:'Предоплаты, лист ожидания, база знаний',lite:'Для текстовых диалогов в одном мессенджере достаточно Lite.',medium:'Аудиосообщения, напоминания и базовая аналитика начинаются с Medium.',proChannels:'Несколько мессенджеров вместе доступны в Pro.',proAdvanced:'Предоплаты, лист ожидания и персональная база знаний входят в Pro.',month:'месяц',year:'год',prepare:'Подготовить заявку',intro:'Здравствуйте! Хочу попробовать ZapysAI в течение 14 дней.',name:'Имя',contact:'Контакт',business:'Бизнес',service:'Услуга',comment:'Комментарий',plan:'Тариф',help:'Нужна помощь с выбором тарифа',price:'Стоимость',billing:'Оплата',ready:'Запрос подготовлен, но ещё не отправлен. Откройте чат @{contact} в Telegram и нажмите «Отправить».',copied:'Текст скопирован. Отправьте его в чат @{contact}.',manual:'Не удалось скопировать автоматически. Выделите и скопируйте текст выше.',apiRoute:'Заявка будет отправлена команде ZapysAI через эту форму.',apiPrivacy:'Отправляя заявку, вы соглашаетесь на связь по указанному контакту.',apiIntro:'Оставьте контакт, и мы напишем в течение рабочего дня.',submit:'Отправить заявку'},
    en:{example:'See a conversation',exampleFor:'Example for',recommended:'The smallest plan that fits',chosen:'You selected',industry:'Business type',channels:'Channels',needs:'Needs',one:'One channel',many:'Two or more',text:'Text and bookings',audio:'Audio, reminders, analytics',advanced:'Deposits, waitlist, knowledge base',lite:'Lite covers text conversations in one messaging channel.',medium:'Voice messages, reminders and basic analytics start with Medium.',proChannels:'Multiple messaging channels together are available in Pro.',proAdvanced:'Deposits, a waitlist and a personal knowledge base are included in Pro.',month:'month',year:'year',prepare:'Prepare enquiry',intro:'Hello! I would like to try ZapysAI for 14 days.',name:'Name',contact:'Contact',business:'Business',service:'Service',comment:'Comment',plan:'Plan',help:'I need help choosing a plan',price:'Price',billing:'Billing',ready:'Your enquiry is prepared, but not sent. Open @{contact} in Telegram and press Send.',copied:'Text copied. Send it to @{contact}.',manual:'Automatic copying failed. Select and copy the text above.',apiRoute:'This form sends your enquiry to the ZapysAI team.',apiPrivacy:'By submitting, you agree to be contacted using the details provided.',apiIntro:'Leave your contact details and we will reply within a business day.',submit:'Send enquiry'},
    es:{example:'Ver una conversación',exampleFor:'Ejemplo para',recommended:'El plan mínimo que necesitas',chosen:'Has elegido',industry:'Sector',channels:'Canales',needs:'Necesidades',one:'Un canal',many:'Dos o más',text:'Texto y reservas',audio:'Audio, recordatorios, analítica',advanced:'Anticipos, lista de espera, base de conocimiento',lite:'Lite cubre conversaciones de texto en un canal de mensajería.',medium:'Los audios, recordatorios y analítica básica empiezan con Medium.',proChannels:'Varios canales de mensajería juntos están disponibles en Pro.',proAdvanced:'Pro incluye anticipos, lista de espera y base de conocimiento personal.',month:'mes',year:'año',prepare:'Preparar consulta',intro:'¡Hola! Quiero probar ZapysAI durante 14 días.',name:'Nombre',contact:'Contacto',business:'Negocio',service:'Servicio',comment:'Comentario',plan:'Plan',help:'Necesito ayuda para elegir un plan',price:'Precio',billing:'Pago',ready:'Tu consulta está preparada, pero no enviada. Abre @{contact} en Telegram y pulsa Enviar.',copied:'Texto copiado. Envíalo a @{contact}.',manual:'No se pudo copiar automáticamente. Selecciona y copia el texto de arriba.',apiRoute:'Este formulario envía tu consulta al equipo ZapysAI.',apiPrivacy:'Al enviar aceptas que te contactemos con los datos facilitados.',apiIntro:'Deja tu contacto y responderemos en un día laborable.',submit:'Enviar consulta'},
    pl:{example:'Zobacz rozmowę',exampleFor:'Przykład dla',recommended:'Najniższy plan do Twoich potrzeb',chosen:'Wybrano',industry:'Branża',channels:'Kanały',needs:'Potrzeby',one:'Jeden komunikator',many:'Dwa lub więcej',text:'Tekst i zapisy',audio:'Audio, przypomnienia, analityka',advanced:'Przedpłaty, lista oczekujących, baza wiedzy',lite:'Lite wystarczy do rozmów tekstowych w jednym komunikatorze.',medium:'Wiadomości głosowe, przypomnienia i podstawowa analityka zaczynają się od Medium.',proChannels:'Kilka komunikatorów razem jest dostępnych w Pro.',proAdvanced:'Pro obejmuje przedpłaty, listę oczekujących i własną bazę wiedzy.',month:'miesiąc',year:'rok',prepare:'Przygotuj zapytanie',intro:'Dzień dobry! Chcę wypróbować ZapysAI przez 14 dni.',name:'Imię',contact:'Kontakt',business:'Firma',service:'Usługa',comment:'Komentarz',plan:'Plan',help:'Potrzebuję pomocy w wyborze planu',price:'Cena',billing:'Płatność',ready:'Zapytanie przygotowane, ale jeszcze niewysłane. Otwórz @{contact} w Telegramie i naciśnij Wyślij.',copied:'Tekst skopiowany. Wyślij go do @{contact}.',manual:'Nie udało się skopiować automatycznie. Zaznacz i skopiuj tekst powyżej.',apiRoute:'Formularz wysyła zapytanie do zespołu ZapysAI.',apiPrivacy:'Wysyłając zapytanie, zgadzasz się na kontakt pod podanymi danymi.',apiIntro:'Zostaw kontakt, a odpowiemy w ciągu dnia roboczego.',submit:'Wyślij zapytanie'}
  };
  // Illustrations of scheduling, not clinical advice or promises of real availability.
  window.ZAPYS_INDUSTRY_EXAMPLES = [
    [
      ['Є завтра час на манікюр?','Так, у цьому прикладі є 16:30 і 18:00. Я AI-помічник студії. Який час вам зручніший?'],
      ['Есть завтра время на маникюр?','Да, в этом примере есть 16:30 и 18:00. Я AI-помощник студии. Какое время вам удобнее?'],
      ['Is there a manicure appointment tomorrow?','In this example, 16:30 and 18:00 are available. I am the studio’s AI assistant. Which works for you?'],
      ['¿Hay cita para manicura mañana?','En este ejemplo hay 16:30 y 18:00. Soy el asistente AI del salón. ¿Qué hora te va bien?'],
      ['Czy jest jutro termin na manicure?','W tym przykładzie są 16:30 i 18:00. Jestem pomocnikiem AI salonu. Która godzina pasuje?']
    ],
    [
      ['Хочу стрижку та бороду. Коли є вільний час?','Я AI-помічник барбершопу. Підкажіть зручний день — запропоную вільний час із календаря.'],
      ['Хочу стрижку и бороду. Когда есть время?','Я AI-помощник барбершопа. Подскажите удобный день — предложу время из календаря.'],
      ['I need a haircut and beard trim. When are you free?','I am the barbershop’s AI assistant. Which day suits you? I can offer available times from the calendar.'],
      ['Quiero corte y barba. ¿Cuándo hay hueco?','Soy el asistente AI de la barbería. Dime qué día te viene bien y buscaré horarios en el calendario.'],
      ['Chcę strzyżenie i brodę. Kiedy jest wolny termin?','Jestem pomocnikiem AI barbershopu. Podaj dogodny dzień, a zaproponuję terminy z kalendarza.']
    ],
    [
      ['Як записатися на консультацію до лікаря?','Я AI-помічник центру. Підкажіть фахівця та зручний день. Медичні питання передам лікарю.'],
      ['Как записаться на консультацию к врачу?','Я AI-помощник центра. Подскажите специалиста и удобный день. Медицинские вопросы передам врачу.'],
      ['How can I book a consultation with a doctor?','I am the centre’s AI assistant. Which specialist and day suit you? Medical questions go to the doctor.'],
      ['¿Cómo reservo una consulta médica?','Soy el asistente AI del centro. Indica especialista y día. Las preguntas médicas las paso al médico.'],
      ['Jak zapisać się na konsultację lekarską?','Jestem pomocnikiem AI centrum. Podaj specjalistę i dogodny dzień. Pytania medyczne przekażę lekarzowi.']
    ],
    [
      ['Можна записатися на огляд зубів?','Я AI-помічник клініки. Допоможу обрати час огляду. Діагностику й план лікування обговорите з лікарем.'],
      ['Можно записаться на осмотр зубов?','Я AI-помощник клиники. Помогу выбрать время осмотра. Диагностику и лечение обсудите с врачом.'],
      ['Can I book a dental check-up?','I am the clinic’s AI assistant. I can help find a check-up time. Diagnosis and treatment are discussed with the dentist.'],
      ['¿Puedo reservar una revisión dental?','Soy el asistente AI de la clínica. Te ayudo a elegir hora. El diagnóstico y tratamiento se consultan con el dentista.'],
      ['Czy mogę zapisać się na przegląd zębów?','Jestem pomocnikiem AI kliniki. Pomogę wybrać termin. Diagnostykę i leczenie omówisz z lekarzem.']
    ],
    [
      ['Хочу на перше тренування. Коли можна?','Я AI-помічник студії. Підкажіть напрям і зручний день — перевірю розклад та допоможу із записом.'],
      ['Хочу на первую тренировку. Когда можно?','Я AI-помощник студии. Подскажите направление и удобный день — проверю расписание и помогу с записью.'],
      ['I’d like to book my first workout. When can I come?','I am the studio’s AI assistant. Which workout and day do you prefer? I can check the schedule and help book.'],
      ['Quiero mi primer entrenamiento. ¿Cuándo puedo ir?','Soy el asistente AI del estudio. Indica actividad y día; consultaré el horario y te ayudaré a reservar.'],
      ['Chcę zapisać się na pierwszy trening. Kiedy mogę?','Jestem pomocnikiem AI studia. Podaj rodzaj treningu i dzień, a sprawdzę grafik i pomogę w zapisie.']
    ],
    [
      ['Є час на першу зустріч наступного тижня?','Я AI-помічник фахівця. Допоможу з організацією зустрічі та вільним часом. Особисті питання передам фахівцю.'],
      ['Есть время на первую встречу на следующей неделе?','Я AI-помощник специалиста. Помогу организовать встречу и выбрать время. Личные вопросы передам специалисту.'],
      ['Is there time for a first meeting next week?','I am the professional’s AI assistant. I can help arrange a meeting and find a time. Personal questions go to the professional.'],
      ['¿Hay hora para una primera reunión la próxima semana?','Soy el asistente AI del profesional. Puedo organizar la reunión y buscar horario. Los temas personales pasan al profesional.'],
      ['Czy jest termin na pierwsze spotkanie w przyszłym tygodniu?','Jestem pomocnikiem AI specjalisty. Pomogę z organizacją i terminem. Sprawy osobiste przekażę specjaliście.']
    ],
    [
      ['Коли можна заїхати на заміну оливи?','Я AI-помічник сервісу. Підкажіть марку авто й зручний день. Нестандартні роботи та оцінку вартості узгодить майстер.'],
      ['Когда можно приехать на замену масла?','Я AI-помощник сервиса. Подскажите марку авто и удобный день. Нестандартные работы и стоимость согласует мастер.'],
      ['When can I come in for an oil change?','I am the workshop’s AI assistant. What car and day suit you? The mechanic confirms nonstandard work and estimates.'],
      ['¿Cuándo puedo ir a cambiar el aceite?','Soy el asistente AI del taller. Indica coche y día. El mecánico confirma trabajos especiales y presupuestos.'],
      ['Kiedy mogę przyjechać na wymianę oleju?','Jestem pomocnikiem AI warsztatu. Podaj markę auta i dogodny dzień. Nietypowe prace i wyceny potwierdzi mechanik.']
    ],
    [
      ['Хочу записатися на перший урок англійської.','Я AI-помічник викладача. Підкажіть ваш рівень і зручні дні — допоможу обрати час першого заняття.'],
      ['Хочу записаться на первый урок английского.','Я AI-помощник преподавателя. Подскажите уровень и удобные дни — помогу выбрать время первого занятия.'],
      ['I’d like to book my first English lesson.','I am the tutor’s AI assistant. Tell me your level and preferred days, and I can help find your first lesson time.'],
      ['Quiero reservar mi primera clase de inglés.','Soy el asistente AI del profesor. Indica nivel y días preferidos para buscar hora para la primera clase.'],
      ['Chcę zapisać się na pierwszą lekcję angielskiego.','Jestem pomocnikiem AI nauczyciela. Podaj poziom i dogodne dni, a pomogę wybrać termin pierwszej lekcji.']
    ]
  ];
})();

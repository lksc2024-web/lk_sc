// Estratégia pronta por nicho: a dor do dono, o que oferecer, o tom, o que evitar, as objeções comuns
// e as mensagens de cada etapa (primeiro contato, lembretes, encerramento), escritas para soar como
// conversa de WhatsApp. O dia entra na mensagem: saudação pela hora, data comercial chegando e
// feriado ou fim de semana. Usado por vendas.js (montarMensagem), pela Prospecção e pela Central.
(function () {
  "use strict";

  // {oi} saudação pela hora · {apresento} "Meu nome é X e faço" · {obs} o que foi observado no Google/site
  // {gancho_data} data comercial chegando · {fecho_dia} feriado/fim de semana · demais chaves vêm de vendas.js
  const SETORES = {
    "Saúde": {
      dono: "Dono ou dona da clínica, muitas vezes atendendo. Quem lê o WhatsApp costuma ser a recepção.",
      dor: "A recepção passa o dia no telefone e no WhatsApp marcando e remarcando horário, e paciente que falta deixa buraco na agenda.",
      dor_curta: "menos tempo da recepção no telefone e menos faltas",
      oferta: "Agendamento online com lembrete automático no WhatsApp", servico: "agendamento",
      tom: "Respeitoso e direto. Fale de organização da agenda, não de \"vender mais\".",
      evitar: ["Prometer resultado de tratamento", "Falar em antes e depois (os conselhos de classe restringem)", "Mandar no meio da manhã, horário de consultas"],
      objecoes: [
        { o: "Já marcamos tudo pelo WhatsApp", r: "Faz sentido, e continua pelo WhatsApp. A diferença é que o paciente escolhe o horário sozinho, até à noite, e recebe o lembrete automático. A recepção só confirma." },
        { o: "Nossos pacientes são mais velhos", r: "Quem prefere ligar continua ligando. O agendamento online pega quem marca à noite ou no fim de semana, que hoje fica sem resposta." },
        { o: "Não temos verba agora", r: "Entendo. Dá para começar só com a página e o botão de agendar, que é o que mais tira trabalho da recepção, e o resto vem depois." },
      ],
      msgs: {
        abordagem: [
          "{oi} {apresento} sites e sistemas para {categorias} {em_cidade}.\n\nSei que em clínica a recepção passa boa parte do dia no telefone e no WhatsApp só para marcar e remarcar horário. {obs}\n\n{gancho_data}Tenho uma ideia de agendamento online para a {nome}: o paciente marca sozinho e recebe lembrete antes da consulta. Posso te mostrar como ficaria?{fecho_dia}",
          "{oi} {apresento} sites para {categorias} {em_cidade}. Encontrei a {nome} pesquisando por aqui. {obs}\n\nUma coisa que costuma pesar em clínica é paciente que esquece e falta. Montei agendas online com lembrete automático no WhatsApp que ajudam bastante nisso.\n\n{gancho_data}Quer que eu te mande um exemplo de como ficaria para vocês?{fecho_dia}",
        ],
        follow1: ["{oi} Passando de novo por aqui sobre o agendamento online da {nome}. Se não for com você que eu falo sobre isso, me diz com quem e eu procuro a pessoa certa."],
        follow2: ["{oi} Fiz um rascunho rápido de como ficaria o agendamento da {nome}: o paciente escolhe o horário, recebe o lembrete no WhatsApp e vocês veem tudo numa agenda só. Te mando a imagem?"],
        encerramento: ["Vou parar de insistir para não atrapalhar a rotina de vocês. Se um dia quiserem tirar a marcação de horário do telefone, me chama aqui. Boa semana!"],
      },
    },
    "Beleza": {
      dono: "Dono ou dona do salão, quase sempre atendendo cliente. Responde nos intervalos.",
      dor: "Passa o dia respondendo \"tem horário?\" no direct, cliente marca e não aparece, e o começo da semana fica vazio.",
      dor_curta: "menos tempo respondendo \"tem horário?\" e menos falta de cliente",
      oferta: "Página com serviços, preços e agendamento online", servico: "agendamento",
      tom: "Leve e próximo, como quem também conhece a correria do salão.",
      evitar: ["Mandar no sábado", "Mensagem longa (ela lê entre um cliente e outro)"],
      objecoes: [
        { o: "Já uso o Instagram", r: "E deve continuar. A página entra no link da bio: a cliente vê os serviços e marca sem precisar esperar resposta no direct." },
        { o: "Já uso um app de agenda", r: "Ótimo, então metade do caminho já está feito. Dá para colocar ele numa página com a cara do salão, ligada ao Google e ao Instagram." },
        { o: "Está caro", r: "Faz a conta comigo: se o agendamento evitar duas faltas por semana, ele se paga rápido. E dá para começar pelo básico." },
      ],
      msgs: {
        abordagem: [
          "{oi} {apresento} sites para {categorias} {em_cidade}.\n\nImagino que boa parte do seu dia vai em responder \"tem horário?\" no direct, né? {obs}\n\n{gancho_data}Tenho uma ideia de página para a {nome} com os serviços e o agendamento direto, a cliente marca sozinha a qualquer hora. Posso te mandar como ficaria?{fecho_dia}",
          "{oi} Vi a {nome} pesquisando {categoria} {em_cidade}. {obs}\n\n{apresento} páginas de agendamento para salões: a cliente escolhe o serviço e o horário e já chega confirmada no seu WhatsApp, com lembrete para não esquecer.\n\n{gancho_data}Quer ver um exemplo?{fecho_dia}",
        ],
        follow1: ["{oi} Sei que a rotina aí é corrida, então serei rápido: posso te mandar o exemplo da página de agendamento? Leva um minuto para ver."],
        follow2: ["{oi} Montei uma prévia de como ficaria a página da {nome}, com os serviços, os preços e o botão de agendar. Te mando a imagem?"],
        encerramento: ["Não vou mais te ocupar com isso. Se um dia quiser parar de responder \"tem horário?\" o dia todo, é só me chamar. Sucesso aí!"],
      },
    },
    "Restaurantes e bares": {
      dono: "Dono ou gerente, que só tem cabeça para mensagem entre o almoço e o jantar.",
      dor: "Paga comissão alta aos aplicativos de delivery, a reserva chega bagunçada pelo WhatsApp e o meio da semana fica vazio.",
      dor_curta: "pedido direto sem comissão de aplicativo e reservas organizadas",
      oferta: "Cardápio online com pedido direto no WhatsApp e reservas", servico: "site",
      tom: "Prático e curto. Fale de margem e de mesa cheia, não de tecnologia.",
      evitar: ["Mandar entre 11h e 14h ou depois das 18h", "Criticar o aplicativo de delivery que eles usam"],
      objecoes: [
        { o: "Já estamos no iFood", r: "E faz sentido continuar lá para quem descobre vocês por ele. O cardápio próprio é para quem já é cliente pedir direto, sem comissão." },
        { o: "Cliente não vai pedir por fora", r: "O cliente que já conhece vocês pede onde for mais fácil. Com o link na bio e no Google, o pedido direto fica a um toque." },
        { o: "Não tenho tempo para cuidar de site", r: "Você não precisa mexer em nada. Mudou preço ou prato, me manda uma foto que eu atualizo." },
      ],
      msgs: {
        abordagem: [
          "{oi} {apresento} sites para {categorias} {em_cidade}.\n\nUma conta que sempre pesa em restaurante é a comissão dos aplicativos em cima de cliente que já conhece a casa. {obs}\n\n{gancho_data}Tenho uma ideia de cardápio online para a {nome}, com pedido direto no WhatsApp de vocês, sem comissão. Posso te mandar como ficaria?{fecho_dia}",
          "{oi} Vi a {nome} pesquisando {categoria} {em_cidade}. {obs}\n\n{apresento} cardápios online com pedido e reserva direto no WhatsApp, para o cliente que já gosta da casa pedir sem passar pelo aplicativo.\n\n{gancho_data}Quer ver um exemplo?{fecho_dia}",
        ],
        follow1: ["{oi} Mandando de novo fora do horário de movimento: posso te mostrar o exemplo do cardápio com pedido direto? Se for melhor falar com outra pessoa daí, me avisa."],
        follow2: ["{oi} Montei uma prévia do cardápio online da {nome}, com os pratos, o botão de pedir no WhatsApp e o de reservar mesa. Te mando a imagem?"],
        encerramento: ["Vou deixar vocês em paz. Se um dia quiserem tirar uma parte dos pedidos da comissão do aplicativo, me chama aqui. Bom movimento aí!"],
      },
    },
    "Padarias e cafés": {
      dono: "Dono que está no balcão cedo. Tem mais calma no meio da manhã e no meio da tarde.",
      dor: "Encomenda de bolo, salgado e cesta chega picada por telefone e WhatsApp, e o cliente não sabe o que dá para encomendar.",
      dor_curta: "encomendas organizadas e cliente sabendo o que pode pedir",
      oferta: "Catálogo de encomendas com pedido pelo WhatsApp", servico: "landing",
      tom: "Simpático e simples, de vizinho.",
      evitar: ["Mandar antes das 9h ou no fim da tarde", "Termos técnicos"],
      objecoes: [
        { o: "O pessoal encomenda no balcão", r: "E continua. O catálogo é para quem decide em casa, à noite, e hoje não tem onde ver as opções." },
        { o: "Não sei mexer nisso", r: "Não precisa. Eu monto e atualizo; você só me manda as fotos e os preços." },
        { o: "Agora não", r: "Tranquilo. Só fica a dica: o catálogo pronto antes das datas grandes, como Páscoa e Natal, é quando ele mais rende." },
      ],
      msgs: {
        abordagem: [
          "{oi} {apresento} sites para {categorias} {em_cidade}.\n\nImagino que encomenda de bolo e salgado chegue aí de todo jeito, por telefone, WhatsApp e no balcão. {obs}\n\n{gancho_data}Pensei num catálogo simples para a {nome}, com fotos, preços e o pedido indo direto para o seu WhatsApp. Posso te mandar um exemplo?{fecho_dia}",
          "{oi} Encontrei a {nome} pesquisando {categoria} {em_cidade}. {obs}\n\n{apresento} catálogos de encomenda para padarias e confeitarias: o cliente escolhe em casa e o pedido chega organizado no WhatsApp.\n\n{gancho_data}Quer ver como ficaria?{fecho_dia}",
        ],
        follow1: ["{oi} Passando de novo sobre o catálogo de encomendas da {nome}. Posso te mandar o exemplo? É rapidinho de ver."],
        follow2: ["{oi} Montei uma prévia do catálogo da {nome}, com as encomendas mais pedidas e o botão do WhatsApp. Te mando a imagem?"],
        encerramento: ["Vou parar por aqui para não incomodar. Se quiserem um catálogo de encomendas antes de alguma data grande, me chama. Boas vendas!"],
      },
    },
    "Academias e estúdios": {
      dono: "Dono ou coordenador, livre fora dos horários de pico de treino.",
      dor: "Aula experimental que não vira matrícula, aluno que some depois de dois ou três meses e queda de movimento no meio do ano.",
      dor_curta: "mais aulas experimentais virando matrícula",
      oferta: "Página de aula experimental com matrícula online", servico: "landing",
      tom: "Animado na medida, focado em matrícula e permanência do aluno.",
      evitar: ["Mandar no começo da manhã ou no fim da tarde", "Prometer corpo ou resultado físico"],
      objecoes: [
        { o: "A gente divulga no Instagram", r: "E funciona para atrair. A página entra depois disso: a pessoa agenda a experimental na hora, sem ficar esperando resposta no direct." },
        { o: "Já tenho sistema de gestão", r: "Ótimo, a página não substitui ele. Ela só traz o aluno novo até a porta, e a matrícula segue no sistema de vocês." },
        { o: "Está caro", r: "Se a página trouxer duas matrículas por mês, ela se paga em pouco tempo. Posso te mostrar a conta." },
      ],
      msgs: {
        abordagem: [
          "{oi} {apresento} sites para {categorias} {em_cidade}.\n\nSei que em academia o desafio não é só atrair, é fazer a aula experimental virar matrícula. {obs}\n\n{gancho_data}Tenho uma ideia de página para a {nome} em que a pessoa agenda a experimental na hora e já recebe o lembrete. Posso te mostrar?{fecho_dia}",
          "{oi} Vi a {nome} pesquisando {categoria} {em_cidade}. {obs}\n\n{apresento} páginas de aula experimental para academias e estúdios: o interessado escolhe o horário, chega confirmado e vocês acompanham quem ainda não fechou.\n\n{gancho_data}Quer ver um exemplo?{fecho_dia}",
        ],
        follow1: ["{oi} Passando de novo sobre a página de aula experimental da {nome}. Te mando o exemplo? Se for com outra pessoa daí, me diz com quem."],
        follow2: ["{oi} Fiz uma prévia de como ficaria a página da {nome}, com os planos, as modalidades e o botão de agendar a experimental. Te mando?"],
        encerramento: ["Vou parar por aqui para não atrapalhar. Se quiserem uma página para transformar experimental em matrícula, me chama. Bons treinos aí!"],
      },
    },
    "Pet": {
      dono: "Dono do pet shop ou da clínica, com mais calma no meio da manhã e no meio da tarde.",
      dor: "Banho e tosa marcados no WhatsApp e no caderno, cliente que esquece de voltar e concorrência das grandes redes.",
      dor_curta: "banho e tosa agendados com lembrete para o cliente voltar",
      oferta: "Agendamento de banho e tosa com lembrete de retorno", servico: "agendamento",
      tom: "Próximo e carinhoso com os animais, sem exagero.",
      evitar: ["Mandar no fim da tarde, horário de buscar os pets"],
      objecoes: [
        { o: "Marcamos tudo no WhatsApp", r: "E pode continuar. O agendamento só organiza: o cliente escolhe o horário e recebe o lembrete do próximo banho, que é o que faz ele voltar." },
        { o: "Cliente daqui é do bairro", r: "Exatamente por isso. O lembrete faz o cliente do bairro voltar no tempo certo, em vez de esquecer e ir na loja grande." },
        { o: "Agora não dá", r: "Tranquilo. Se quiser, te mando só o exemplo para guardar e ver quando der." },
      ],
      msgs: {
        abordagem: [
          "{oi} {apresento} sites para {categorias} {em_cidade}.\n\nUma coisa que vejo muito em pet shop é o cliente que gosta do banho e tosa mas esquece de voltar no tempo certo. {obs}\n\n{gancho_data}Pensei num agendamento para a {nome} que avisa o tutor quando está na hora do próximo banho. Posso te mandar como ficaria?{fecho_dia}",
          "{oi} Encontrei a {nome} pesquisando {categoria} {em_cidade}. {obs}\n\n{apresento} páginas de agendamento de banho e tosa: o tutor marca sozinho, recebe o lembrete e volta no tempo certo.\n\n{gancho_data}Quer ver um exemplo?{fecho_dia}",
        ],
        follow1: ["{oi} Passando de novo sobre o agendamento de banho e tosa da {nome}. Posso te mandar o exemplo? É rápido de ver."],
        follow2: ["{oi} Montei uma prévia da página da {nome}, com os serviços, os horários e o lembrete de retorno. Te mando a imagem?"],
        encerramento: ["Vou parar de insistir. Se um dia quiserem que os clientes voltem no tempo certo sem vocês precisarem lembrar um por um, me chama. Abraço!"],
      },
    },
    "Imobiliário": {
      dono: "Corretor ou dono da imobiliária. Manhã é o melhor horário; fim de tarde é de visita.",
      dor: "Depende de portal pago, recebe contato frio e os imóveis ficam só no Instagram, sem filtro de bairro e preço.",
      dor_curta: "contato de quem já quer o imóvel, sem depender só de portal pago",
      oferta: "Site próprio de imóveis com filtro e captação de contato", servico: "site",
      tom: "Profissional e objetivo, falando de lead e de visita marcada.",
      evitar: ["Mandar no fim da tarde", "Desmerecer os portais"],
      objecoes: [
        { o: "Já anuncio nos portais", r: "E faz sentido. O site próprio é para o contato que chega pelo seu Instagram e pelo Google não se perder nem ir para outro corretor." },
        { o: "Não tenho tempo de cadastrar imóvel", r: "Eu cuido do cadastro no começo. Depois é foto e descrição, do celular mesmo." },
        { o: "Está caro", r: "Uma venda ou locação fechada pelo site já paga o projeto. Posso te mostrar a conta com o seu ticket." },
      ],
      msgs: {
        abordagem: [
          "{oi} {apresento} sites para {categorias} {em_cidade}.\n\nVejo muito corretor bom dependendo só de portal pago e recebendo contato frio. {obs}\n\n{gancho_data}Tenho uma ideia de site para a {nome}, com os imóveis filtrados por bairro e preço e o contato indo direto para o seu WhatsApp. Posso te mostrar?{fecho_dia}",
          "{oi} Encontrei a {nome} pesquisando {categoria} {em_cidade}. {obs}\n\n{apresento} sites de imóveis para corretores e imobiliárias, para quem chega pelo Instagram e pelo Google achar o imóvel certo e já chamar vocês.\n\n{gancho_data}Quer ver um exemplo?{fecho_dia}",
        ],
        follow1: ["{oi} Passando de novo sobre o site de imóveis da {nome}. Posso te mandar o exemplo? Se for com outra pessoa, me diz com quem falo."],
        follow2: ["{oi} Fiz uma prévia de como ficaria o site da {nome}, com a busca por bairro e faixa de preço e o botão de agendar visita. Te mando?"],
        encerramento: ["Vou parar por aqui. Se quiser um site próprio para não depender só dos portais, me chama. Boas vendas!"],
      },
    },
    "Turismo e hospedagem": {
      dono: "Dono da pousada ou da agência. Começo de semana é o melhor momento; fim de semana e feriado são de hóspede.",
      dor: "Paga comissão alta nas plataformas de reserva e não tem uma página própria para o hóspede reservar direto.",
      dor_curta: "reserva direta, sem comissão de plataforma",
      oferta: "Página de reservas direta com fotos e WhatsApp", servico: "site",
      tom: "Tranquilo e caloroso, falando de reserva direta e hóspede que volta.",
      evitar: ["Mandar de sexta a domingo ou em feriado"],
      objecoes: [
        { o: "Já estou no Booking/Airbnb", r: "E deve continuar lá para ser encontrado. A página própria é para o hóspede que já conhece vocês reservar direto, sem comissão." },
        { o: "Hóspede prefere plataforma", r: "Para a primeira vez, às vezes sim. Quem volta ou chega por indicação costuma preferir falar direto, se tiver onde." },
        { o: "Agora é alta temporada", r: "Entendo. Dá para deixar combinado para a baixa, que é quando a página própria mais ajuda." },
      ],
      msgs: {
        abordagem: [
          "{oi} {apresento} sites para {categorias} {em_cidade}.\n\nUma coisa que pesa em pousada é a comissão das plataformas até em hóspede que já conhece a casa. {obs}\n\n{gancho_data}Tenho uma ideia de página de reservas para a {nome}, com fotos, datas e a reserva direto no seu WhatsApp. Posso te mostrar?{fecho_dia}",
          "{oi} Encontrei a {nome} pesquisando {categoria} {em_cidade}. {obs}\n\n{apresento} páginas de reserva direta para pousadas e hotéis, para quem volta ou chega por indicação reservar sem passar pela plataforma.\n\n{gancho_data}Quer ver um exemplo?{fecho_dia}",
        ],
        follow1: ["{oi} Passando de novo sobre a página de reservas da {nome}. Te mando o exemplo?"],
        follow2: ["{oi} Montei uma prévia da página da {nome}, com as acomodações, as fotos e o botão de reservar pelo WhatsApp. Te mando a imagem?"],
        encerramento: ["Vou parar por aqui para não incomodar. Se quiserem reserva direta sem comissão, me chama. Boa temporada!"],
      },
    },
    "Escritórios": {
      dono: "O próprio profissional (advogado, contador, arquiteto). Horário comercial, fora do almoço.",
      dor: "Cliente novo chega quase só por indicação, o site antigo passa insegurança e a triagem dos contatos toma tempo.",
      dor_curta: "contatos chegando já filtrados e um site que passa confiança",
      oferta: "Site profissional com formulário que já filtra o tipo de caso", servico: "site",
      tom: "Sóbrio e profissional. Nada de promessa de resultado.",
      evitar: ["Prometer clientes ou causas (a OAB e os conselhos restringem publicidade)", "Mandar na hora do almoço"],
      objecoes: [
        { o: "Trabalho só com indicação", r: "E indicação é o melhor cliente. Só que quem é indicado pesquisa o nome antes de ligar, e o site é o que ele encontra." },
        { o: "Já tenho site", r: "Ótimo. Posso olhar com calma e te dizer o que vale ajustar, sem compromisso." },
        { o: "Não posso fazer publicidade", r: "Por isso o site é informativo: quem você é, áreas de atuação e como falar com você, sem promessa." },
      ],
      msgs: {
        abordagem: [
          "{oi} {apresento} sites para {categorias} {em_cidade}.\n\nMesmo quem trabalha muito por indicação acaba sendo pesquisado no Google antes do primeiro contato. {obs}\n\n{gancho_data}Tenho uma ideia de site sóbrio para a {nome}, com as áreas de atuação e um formulário que já chega com o tipo de caso. Posso te mostrar?{fecho_dia}",
          "{oi} Encontrei a {nome} pesquisando {categoria} {em_cidade}. {obs}\n\n{apresento} sites para escritórios: informativos, dentro das regras da profissão, e com os contatos chegando já organizados.\n\n{gancho_data}Quer ver um exemplo?{fecho_dia}",
        ],
        follow1: ["{oi} Passando de novo sobre o site da {nome}. Posso te mandar o exemplo? Se for melhor falar com outra pessoa do escritório, me avisa."],
        follow2: ["{oi} Fiz um rascunho de como ficaria o site da {nome}, com as áreas de atuação e o formulário de contato. Te mando?"],
        encerramento: ["Vou parar por aqui. Se em algum momento quiser um site que passe a confiança do seu trabalho, me chama. Boa semana!"],
      },
    },
    "Automotivo": {
      dono: "Dono da oficina, com a mão na graxa. Lê mensagem antes de abrir, no almoço e ao fechar.",
      dor: "O telefone toca o dia todo para perguntar \"quanto fica?\" e o cliente novo desconfia de orçamento de oficina.",
      dor_curta: "cliente chegando confiante e menos ligação de \"quanto fica?\"",
      oferta: "Página com serviços, fotos do trabalho e orçamento ou agendamento pelo WhatsApp", servico: "landing",
      tom: "Direto e de igual para igual. Fale de confiança e de agenda cheia.",
      evitar: ["Mandar no meio da manhã ou no meio da tarde", "Mensagem longa"],
      objecoes: [
        { o: "Meu cliente é indicação", r: "E é o melhor. Quem é indicado ainda pesquisa antes de vir, e ver as fotos do trabalho tira a desconfiança." },
        { o: "Não tenho tempo para isso", r: "Por isso eu cuido de tudo. Você me manda umas fotos do serviço pelo WhatsApp e pronto." },
        { o: "Está caro", r: "Um serviço a mais por mês já paga. E dá para começar só com a página e o botão de agendar." },
      ],
      msgs: {
        abordagem: [
          "{oi} {apresento} sites para {categorias} {em_cidade}.\n\nSei que oficina vive de confiança, e cliente novo chega desconfiado de orçamento. {obs}\n\n{gancho_data}Pensei numa página para a {nome} com os serviços, fotos do trabalho de vocês e o orçamento pelo WhatsApp. Posso te mandar como ficaria?{fecho_dia}",
          "{oi} Encontrei a {nome} pesquisando {categoria} {em_cidade}. {obs}\n\n{apresento} páginas para oficinas: o cliente vê os serviços, as fotos e já marca a revisão pelo WhatsApp.\n\n{gancho_data}Quer ver um exemplo?{fecho_dia}",
        ],
        follow1: ["{oi} Passando rapidinho de novo sobre a página da {nome}. Te mando o exemplo?"],
        follow2: ["{oi} Montei uma prévia da página da {nome}, com os serviços e o botão de agendar revisão. Te mando a imagem?"],
        encerramento: ["Vou parar por aqui. Se quiser uma página para o cliente chegar confiando no serviço de vocês, me chama. Abraço!"],
      },
    },
    "Obras e serviços": {
      dono: "Dono em campo o dia todo. Responde cedo, no almoço e à noite.",
      dor: "Perde orçamento porque não consegue responder na hora, e o cliente pede foto de trabalhos antes de fechar.",
      dor_curta: "pedido de orçamento chegando completo, com o cliente já tendo visto seus trabalhos",
      oferta: "Página de orçamento rápido com galeria de obras", servico: "landing",
      tom: "Simples e prático, sem enrolação.",
      evitar: ["Mandar no horário de obra (9h às 12h e 14h às 18h)", "Termos de marketing"],
      objecoes: [
        { o: "Trabalho por indicação", r: "E a indicação continua. A página só mostra os trabalhos para quem foi indicado e quer ver antes de chamar." },
        { o: "Não tenho tempo de responder", r: "É justamente isso: o formulário já pergunta o que você precisa saber (tipo de serviço, bairro, fotos), e você responde quando sair da obra." },
        { o: "Está caro", r: "Um orçamento fechado a mais já paga. Dá para começar simples." },
      ],
      msgs: {
        abordagem: [
          "{oi} {apresento} sites para {categorias} {em_cidade}.\n\nImagino que você passe o dia na obra e perca orçamento por não conseguir responder na hora. {obs}\n\n{gancho_data}Pensei numa página para a {nome} com fotos dos seus trabalhos e um pedido de orçamento que já chega completo no WhatsApp. Posso te mandar como ficaria?{fecho_dia}",
          "{oi} Encontrei a {nome} pesquisando {categoria} {em_cidade}. {obs}\n\n{apresento} páginas para quem trabalha em campo: o cliente vê os trabalhos e manda o pedido de orçamento com tudo que você precisa saber.\n\n{gancho_data}Quer ver um exemplo?{fecho_dia}",
        ],
        follow1: ["{oi} Mandando de novo fora do horário de obra: posso te mostrar o exemplo da página de orçamento?"],
        follow2: ["{oi} Montei uma prévia da página da {nome}, com a galeria de trabalhos e o pedido de orçamento. Te mando a imagem?"],
        encerramento: ["Vou parar por aqui para não atrapalhar. Se quiser parar de perder orçamento por não conseguir responder, me chama. Bom trabalho!"],
      },
    },
    "Lojas": {
      dono: "Dono ou vendedor, mais livre antes do movimento da tarde.",
      dor: "O cliente pergunta preço no direct e some, e a loja vende só para quem passa na porta.",
      dor_curta: "catálogo com preço e pedido direto, vendendo também para quem não passa na porta",
      oferta: "Catálogo online com pedido pelo WhatsApp", servico: "landing",
      tom: "Comercial, mas leve. Fale de venda e de cliente que some.",
      evitar: ["Mandar no fim da tarde", "Mandar no sábado"],
      objecoes: [
        { o: "Vendo pelo Instagram", r: "E deve continuar. O catálogo entra no link da bio, com preço e tamanho, e o cliente pede sem esperar resposta." },
        { o: "Meu estoque muda muito", r: "O catálogo é simples de atualizar, do celular. E eu ajudo no começo." },
        { o: "Está caro", r: "Algumas vendas a mais já pagam. Posso te mostrar a conta com o seu ticket médio." },
      ],
      msgs: {
        abordagem: [
          "{oi} {apresento} sites para {categorias} {em_cidade}.\n\nSabe aquele cliente que pergunta o preço no direct e some? {obs}\n\n{gancho_data}Pensei num catálogo para a {nome} com fotos, preços e o pedido indo direto para o WhatsApp, para vender também para quem não passa na porta. Posso te mandar como ficaria?{fecho_dia}",
          "{oi} Encontrei a {nome} pesquisando {categoria} {em_cidade}. {obs}\n\n{apresento} catálogos online para lojas: o cliente escolhe, vê o preço e já manda o pedido no WhatsApp.\n\n{gancho_data}Quer ver um exemplo?{fecho_dia}",
        ],
        follow1: ["{oi} Passando de novo sobre o catálogo da {nome}. Te mando o exemplo? É rápido de ver."],
        follow2: ["{oi} Montei uma prévia do catálogo da {nome}, com os produtos em destaque e o botão de pedir no WhatsApp. Te mando a imagem?"],
        encerramento: ["Vou parar por aqui. Se quiserem vender também para quem não passa na porta, me chama. Boas vendas!"],
      },
    },
    "Educação": {
      dono: "Diretor ou coordenador, livre fora da entrada e saída de alunos.",
      dor: "A matrícula depende de visita e telefonema, e os pais pesquisam à noite, quando a escola está fechada.",
      dor_curta: "pais agendando visita e pré-matrícula a qualquer hora",
      oferta: "Página de matrícula com agendamento de visita", servico: "site",
      tom: "Cuidadoso e confiável, falando com quem decide pela família.",
      evitar: ["Mandar na entrada e na saída dos alunos"],
      objecoes: [
        { o: "Nossas vagas enchem por indicação", r: "E é ótimo. A página só facilita para a família indicada agendar a visita sem depender do horário da secretaria." },
        { o: "Já temos site", r: "Posso olhar com calma e te dizer se vale incluir o agendamento de visita e a pré-matrícula." },
        { o: "Agora não", r: "Entendo. O melhor momento é antes do período de matrículas; se quiser, deixo o exemplo com você." },
      ],
      msgs: {
        abordagem: [
          "{oi} {apresento} sites para {categorias} {em_cidade}.\n\nOs pais costumam pesquisar escola à noite, quando a secretaria já fechou. {obs}\n\n{gancho_data}Tenho uma ideia de página para a {nome} em que a família agenda a visita e faz a pré-matrícula a qualquer hora. Posso te mostrar?{fecho_dia}",
          "{oi} Encontrei a {nome} pesquisando {categoria} {em_cidade}. {obs}\n\n{apresento} páginas de matrícula para escolas e cursos: a família conhece a proposta, agenda a visita e vocês recebem tudo organizado.\n\n{gancho_data}Quer ver um exemplo?{fecho_dia}",
        ],
        follow1: ["{oi} Passando de novo sobre a página de matrícula da {nome}. Posso te mandar o exemplo? Se for com outra pessoa da escola, me diz com quem falo."],
        follow2: ["{oi} Fiz uma prévia de como ficaria a página da {nome}, com a proposta pedagógica e o agendamento de visita. Te mando?"],
        encerramento: ["Vou parar por aqui. Se quiserem facilitar a visita e a matrícula para as famílias, me chama. Bom trabalho aí!"],
      },
    },
    "Eventos": {
      dono: "Dono do buffet ou do espaço, ou o profissional (fotógrafo, DJ). Começo da semana é o melhor momento.",
      dor: "Pedido de orçamento chega sem data nem número de convidados, e o portfólio fica espalhado no Instagram.",
      dor_curta: "pedido de orçamento chegando com data e convidados, e portfólio num lugar só",
      oferta: "Página com portfólio e formulário de orçamento completo", servico: "landing",
      tom: "Caloroso e visual, falando de data fechada.",
      evitar: ["Mandar de sexta a domingo, dias de evento"],
      objecoes: [
        { o: "Meu portfólio está no Instagram", r: "E pode continuar lá. A página junta o melhor dele e já pergunta a data e os convidados, então você responde com o orçamento certo." },
        { o: "Fecho tudo por indicação", r: "A indicação continua. A página só ajuda quem foi indicado a ver tudo e pedir o orçamento completo." },
        { o: "Está caro", r: "Um evento fechado a mais já paga. Posso te mostrar a conta." },
      ],
      msgs: {
        abordagem: [
          "{oi} {apresento} sites para {categorias} {em_cidade}.\n\nImagino quanto tempo vai em responder pedido de orçamento que chega sem data nem número de convidados. {obs}\n\n{gancho_data}Pensei numa página para a {nome} com o portfólio e um pedido de orçamento que já chega completo. Posso te mandar como ficaria?{fecho_dia}",
          "{oi} Encontrei a {nome} pesquisando {categoria} {em_cidade}. {obs}\n\n{apresento} páginas para buffets e profissionais de eventos: o cliente vê o portfólio e pede o orçamento com data e convidados.\n\n{gancho_data}Quer ver um exemplo?{fecho_dia}",
        ],
        follow1: ["{oi} Passando de novo, já no começo da semana, sobre a página da {nome}. Te mando o exemplo?"],
        follow2: ["{oi} Montei uma prévia da página da {nome}, com as fotos dos eventos e o formulário de orçamento. Te mando a imagem?"],
        encerramento: ["Vou parar por aqui. Se quiser receber pedidos de orçamento completos, me chama. Bons eventos!"],
      },
    },
    "Outros": {
      dono: "Dono do negócio, em horário comercial.",
      dor: "Quem pesquisa no Google não encontra informação suficiente e acaba chamando o concorrente.",
      dor_curta: "ser encontrado no Google com tudo que o cliente precisa ver",
      oferta: "Site ou página com serviços e WhatsApp", servico: "site",
      tom: "Simples e direto.",
      evitar: ["Mensagem longa", "Mandar fora do horário comercial"],
      objecoes: [
        { o: "Não preciso de site", r: "Pode ser. Só te mostro o que o cliente encontra hoje quando pesquisa vocês, e você decide." },
        { o: "Está caro", r: "Dá para começar simples. Um cliente a mais por mês costuma pagar." },
        { o: "Agora não", r: "Tranquilo. Deixo o exemplo com você para ver quando der." },
      ],
      msgs: {
        abordagem: [
          "{oi} {apresento} sites e sistemas para empresas {em_cidade}.\n\nEncontrei a {nome} no Google. {obs}\n\n{gancho_data}Tenho uma ideia simples para quem pesquisa vocês encontrar tudo e chamar direto no WhatsApp. Posso te mostrar?{fecho_dia}",
        ],
        follow1: ["{oi} Passando de novo sobre a ideia para a {nome}. Te mando o exemplo?"],
        follow2: ["{oi} Fiz uma prévia rápida de como ficaria a página da {nome}. Te mando a imagem?"],
        encerramento: ["Vou parar por aqui para não incomodar. Se precisarem, é só me chamar. Abraço!"],
      },
    },
  };

  // Respostas do meio da conversa: as mesmas para todos, com a dor do setor entrando no texto.
  const RESPOSTAS = {
    atencao: "Claro. Funciona assim: eu olho como a {nome} aparece hoje no Google e no celular e te mando um diagnóstico curto, de graça, focado em {dor_curta}. " +
      "Se fizer sentido, te passo uma proposta fechada, com o que entra, prazo ({prazo}) e valor, sem surpresa.{portfolio_frase2}{exemplos}\n\nPosso fazer o diagnóstico?",
    desejo: "Combinado, vou montar a prévia da {nome}. Só me conta duas coisas para eu acertar: hoje os clientes chegam mais pelo Instagram, pelo Google ou por indicação? E prefere ver numa ligação rápida ou por aqui mesmo?{exemplos}",
    rejeicao: "Tranquilo, obrigado por responder. Só por curiosidade: já tem alguém cuidando disso ou não é prioridade agora? Se mudar, é só me chamar.",
    aprovacao: "Fechado então. Vou te mandar a proposta com o que entra, o prazo ({prazo}) e o valor. Qual e-mail eu uso e em nome de quem faço?",
    retomar: "{oi} {de_novo}Passando para retomar o que conversamos sobre {curto}. Ficou alguma dúvida que eu possa responder?",
    valor: "Te explico de um jeito simples como funcionaria para a {nome}.\n\nOnde vocês ganham: {retorno}.\nO que muda no dia a dia: {uso}.\nResultado esperado: {resultado}.\n\n" +
      "Uma conta rápida: {exemplo_retorno}{manutencao_frase}{exemplos}\n\nQuer que eu monte a proposta com o que entra e o prazo ({prazo})?",
  };

  const semAcento = (s) => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
  const V = () => window.Vendas;
  const K = () => (window.Calendario && window.Calendario.pronto() ? window.Calendario : null);
  function setorDe(nicho) { const v = V(); const t = v ? v.rotinaDe(nicho || "").tipo : "Outros"; return SETORES[t] ? t : "Outros"; }
  function doNicho(nicho) { return { tipo: setorDe(nicho), ...SETORES[setorDe(nicho)] }; }
  function hash(s) { let h = 0; for (const c of String(s)) h = (h * 31 + c.charCodeAt(0)) | 0; return Math.abs(h); }
  const preencher = (t, vars) => t.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? vars[k] : m));
  const limpar = (t) => t.replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").replace(/ {2,}/g, " ").replace(/\.\./g, ".").replace(/ \./g, ".").trim();

  // Lugar e dia do lead (o fuso e os feriados dele, não os seus).
  function localDoLead(l) { const g = (l.dados && l.dados.geo) || {}; return { pais: g.pais || "BR", uf: l.uf, cidade: l.cidade, tz: g.tz || "America/Sao_Paulo" }; }
  function diaDoLead(l, quando) {
    const loc = localDoLead(l), k = K(), v = V();
    const hora = v ? v.horaEm(loc.tz, quando) : { h: new Date().getHours(), dow: new Date().getDay() };
    const ctx = k ? k.contextoDia(quando ? new Intl.DateTimeFormat("en-CA", { timeZone: loc.tz }).format(quando) : k.hojeEm(loc.tz), loc) : null;
    return { hora, ctx, loc };
  }
  function saudacao(h) { return h < 12 ? "Bom dia, tudo bem?" : h < 18 ? "Boa tarde, tudo bem?" : "Boa noite, tudo bem?"; }
  function fechoDia(ctx, hora) {
    if (!ctx) return "";
    if (ctx.feriado) return "\n\nSei que hoje é feriado, responde quando der.";
    if (ctx.dow === 0 || ctx.dow === 6) return "\n\nSem pressa, pode ver na segunda.";
    if (ctx.vespera && hora.h >= 14) return "\n\nSem pressa, sei que véspera de feriado é corrido.";
    if (ctx.dow === 5 && hora.h >= 15) return "\n\nSe preferir, vê com calma na segunda.";
    return "";
  }
  function ganchoData(ctx, nicho, tipo) {
    if (!ctx) return { txt: "", op: null };
    const op = ctx.oportunidade(nicho, tipo);
    if (!op.ev || op.v < 0.45) return { txt: "", op: null };
    const k = K(), quando = k ? k.curta(op.ev.dia) : "";
    return { txt: `Com ${artigo(op.ev.nome)} chegando (${quando}), pensei também em ${comArtigo(op.ev.oferta)} para vocês usarem na data.\n\n`, op };
  }
  function comArtigo(o) {
    const n = semAcento(o);
    if (/^(pagina|campanha|venda|vitrine)/.test(n)) return "uma " + o;
    if (/^(catalogo|agendamento|pacote|cardapio)/.test(n)) return "um " + o;
    return o;
  }
  function artigo(nome) {
    const n = semAcento(nome);
    if (/^(dia|natal|carnaval|reveillon|verao|janeiro|outubro|novembro|feriadao)/.test(n)) return "o " + nome;
    if (/^(festas|confraterniza)/.test(n)) return "as " + nome.charAt(0).toLowerCase() + nome.slice(1);
    if (/^(ferias)/.test(n)) return "as " + nome.charAt(0).toLowerCase() + nome.slice(1);
    if (/^(matricula|reformas|revisao)/.test(n)) return "as " + nome.charAt(0).toLowerCase() + nome.slice(1);
    return "a " + nome;
  }

  // Texto pronto de uma etapa para um lead. Devolve null quando a etapa não é do roteiro (vendas.js usa o padrão).
  function texto(l, etapa, vars, perfil = {}, quando = null) {
    const est = doNicho(l.nicho || l.categoria);
    const { hora, ctx } = diaDoLead(l, quando);
    const nicho = l.nicho || l.categoria || "";
    const g = ["abordagem", "follow2"].includes(etapa) ? ganchoData(ctx, nicho, est.tipo) : { txt: "" };
    const nome = perfil.nome;
    const extra = {
      oi: saudacao(hora.h),
      apresento: nome ? `Meu nome é ${nome} e faço` : "Eu faço",
      obs: ["crm", "app"].includes(vars.op_id) ? `Vi que a ${vars.nome} já tem uma presença forte no Google, com ${vars.avaliacoes} avaliações.`
        : vars.problema ? `Uma coisa que reparei: ${vars.problema}.` : "",
      gancho_data: g.txt, fecho_dia: ["abordagem", "follow1", "follow2"].includes(etapa) ? fechoDia(ctx, hora) : "",
      dor_curta: est.dor_curta,
    };
    const todas = { ...vars, ...extra };
    let modelo = null;
    if (est.msgs[etapa]) { const lista = est.msgs[etapa]; modelo = lista[hash(`${l.id || l.nome}|${etapa}`) % lista.length]; }
    else if (RESPOSTAS[etapa]) modelo = RESPOSTAS[etapa];
    if (!modelo) return null;
    let t = limpar(preencher(modelo, todas));
    // primeira letra depois da saudação em maiúscula quando o obs vem vazio etc.
    t = t.replace(/(^|\n\n)([a-zà-ú])/g, (m, a, b) => a + b.toUpperCase());
    return t;
  }

  // Sequência por dia: quando mandar cada etapa para um nicho (melhor dia e horário, pulando feriado),
  // a partir de uma data. Usa os intervalos dos lembretes (padrão 3, 7 e 7 dias).
  function sequencia(nicho, inicio, local, dados = {}, inter = { follow1: 3, follow2: 7, encerramento: 7 }) {
    const k = K(), v = V(); if (!k || !v) return [];
    const est = doNicho(nicho), campo = ["Automotivo", "Obras e serviços"].includes(est.tipo);
    const etapas = [["abordagem", 0], ["follow1", inter.follow1], ["follow2", inter.follow2], ["encerramento", inter.encerramento]];
    const out = []; let base = inicio;
    for (const [etapa, gap] of etapas) {
      const alvo = k.somar(base, gap);
      let melhor = null;
      for (let j = 0; j < 4; j++) {
        const d = k.somar(alvo, j), ctx = k.contextoDia(d, local);
        if (ctx.feriado && !campo) continue;
        const r = v.rankingPeriodos([nicho], ctx, dados).map((p) => ({ p, n: p.nichos[0] })).sort((a, b) => b.n.taxa - a.n.taxa)[0];
        const nota = r.n.taxa * (1 - j * 0.06); // não empurrar demais: cada dia de atraso pesa um pouco
        if (!melhor || nota > melhor.nota) melhor = { data: d, ctx, periodo: r.p, faixa: r.n.rotulo, taxa: r.n.taxa, nota, dataCom: r.n.data };
      }
      if (!melhor) melhor = { data: alvo, ctx: k.contextoDia(alvo, local), periodo: v.PERIODOS[0], faixa: "9–11h", taxa: 0, nota: 0 };
      out.push({ etapa, ...melhor });
      base = melhor.data;
    }
    return out;
  }

  // Melhor dia da semana para o nicho (próximos 7 dias) e o pior, para a estratégia mostrar.
  function diasDaSemana(nicho, inicio, local, dados = {}) {
    const k = K(), v = V(); if (!k || !v) return [];
    return [0, 1, 2, 3, 4, 5, 6].map((j) => {
      const d = k.somar(inicio, j), ctx = k.contextoDia(d, local);
      const r = v.rankingPeriodos([nicho], ctx, dados).map((p) => ({ p, n: p.nichos[0] })).sort((a, b) => b.n.taxa - a.n.taxa)[0];
      return { data: d, ctx, periodo: r.p, faixa: r.n.rotulo, taxa: r.n.taxa, dataCom: r.n.data };
    });
  }

  window.Estrategias = { SETORES, RESPOSTAS, doNicho, setorDe, texto, sequencia, diasDaSemana, localDoLead };
})();

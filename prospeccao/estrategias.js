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
        follow2: ["{oi} Fiz uma prévia rápida de como ficaria a página da {nome}. Te mando a imagem?"],
        encerramento: ["Vou parar por aqui para não incomodar. Se precisarem, é só me chamar. Abraço!"],
      },
    },
  };


  // Conversa em partes: o primeiro contato é curto (quem sou, por que estou escrevendo, um convite) e
  // a ideia do nicho só aparece quando o lead responde. Assim a mensagem não parece disparo nem golpe.
  const CONVERSA = {
    "Saúde": { sobre: "para a agenda de vocês", pergunta: "hoje vocês marcam mais por telefone ou pelo WhatsApp?",
      ideia: "Em clínica, a recepção passa boa parte do dia marcando e remarcando horário. A ideia é um agendamento online em que o paciente marca sozinho e recebe lembrete no WhatsApp antes da consulta." },
    "Beleza": { sobre: "para a agenda do salão", pergunta: "hoje a maioria das clientes chega pelo Instagram ou por indicação?",
      ideia: "Sei que muito do dia vai em responder \"tem horário?\" no direct. A ideia é uma página com os serviços e o agendamento direto, a cliente marca sozinha a qualquer hora." },
    "Restaurantes e bares": { sobre: "para os pedidos de vocês", pergunta: "hoje os pedidos chegam mais pelo aplicativo, pelo Instagram ou pelo WhatsApp?",
      ideia: "A ideia é um cardápio online com pedido direto no WhatsApp de vocês, para o cliente que já conhece a casa pedir sem a comissão do aplicativo." },
    "Padarias e cafés": { sobre: "para as encomendas", pergunta: "hoje as encomendas chegam mais por telefone ou pelo WhatsApp?",
      ideia: "A ideia é uma página mostrando o que dá para encomendar, bolos, salgados e cestas, com o pedido chegando completo no WhatsApp." },
    "Academias e estúdios": { sobre: "para as aulas experimentais", pergunta: "hoje a aula experimental é marcada pelo direct ou pelo WhatsApp?",
      ideia: "A ideia é uma página de aula experimental: a pessoa escolhe o horário e já chega agendada no WhatsApp de vocês." },
    "Pet": { sobre: "para o banho e tosa", pergunta: "hoje vocês marcam banho e tosa mais pelo WhatsApp ou por telefone?",
      ideia: "A ideia é o banho e tosa com agendamento online e um lembrete automático para o cliente voltar no tempo certo." },
    "Imobiliário": { sobre: "para os contatos dos imóveis", pergunta: "hoje a maioria dos contatos vem do portal ou do Instagram?",
      ideia: "A ideia é um site com os imóveis organizados e o contato caindo direto no WhatsApp, sem depender só do portal pago." },
    "Turismo e hospedagem": { sobre: "para as reservas", pergunta: "hoje a maior parte das reservas vem da plataforma ou direto com vocês?",
      ideia: "A ideia é um site com reserva direta, para o hóspede que já encontrou vocês não precisar passar pela plataforma e pela comissão." },
    "Escritórios": { sobre: "para o site de vocês", pergunta: "hoje os clientes chegam mais por indicação ou pelo Google?",
      ideia: "A ideia é um site sóbrio, com as áreas de atuação e um formulário que já chega com o tipo de caso." },
    "Automotivo": { sobre: "para os orçamentos", pergunta: "hoje o pessoal pede orçamento mais por telefone ou pelo WhatsApp?",
      ideia: "A ideia é uma página com os serviços, fotos da oficina e um pedido de orçamento que já chega com o carro e o problema." },
    "Obras e serviços": { sobre: "para os orçamentos", pergunta: "hoje os pedidos chegam mais por indicação ou pela internet?",
      ideia: "A ideia é uma página com os seus trabalhos e um pedido de orçamento que chega completo, com o tipo de serviço e as fotos." },
    "Lojas": { sobre: "para as vendas", pergunta: "hoje vocês vendem mais na loja ou pelo Instagram?",
      ideia: "A ideia é um catálogo com preço e pedido direto no WhatsApp, para vender também para quem não passa na porta." },
    "Educação": { sobre: "para as matrículas", pergunta: "hoje as matrículas começam mais por visita ou pelo WhatsApp?",
      ideia: "A ideia é uma página para os pais agendarem visita e fazerem a pré-matrícula a qualquer hora." },
    "Eventos": { sobre: "para os orçamentos", pergunta: "hoje os pedidos de orçamento chegam mais pelo Instagram ou pelo WhatsApp?",
      ideia: "A ideia é uma página com o portfólio e um pedido de orçamento que já chega com a data e o número de convidados." },
    "Outros": { sobre: "sobre isso", pergunta: "hoje os clientes chegam mais pelo Google, pelo Instagram ou por indicação?",
      ideia: "A ideia é uma página simples para quem pesquisa vocês encontrar tudo e chamar direto no WhatsApp." },
  };
  // 1ª mensagem: apresentação, motivo do contato e um convite. Nada de preço, link ou proposta.
  const ABERTURA = "{oi} {apresento} sites para {categorias} {em_cidade}.\n\nEstava pesquisando {categorias} por aqui e vi vocês. {obs_curta}Posso te mandar uma ideia rápida {sobre_convite}?{fecho_dia}";
  // Lembrete 1: o lead ainda não respondeu, então não cita nada que ele não leu.
  const LEMBRETE = "{oi} Passando de novo por aqui: posso te mandar aquela ideia que comentei? Se for melhor falar com outra pessoa daí, me avisa.{fecho_dia}";
  // Quando o lead abre a conversa: a ideia do nicho e uma pergunta sobre o negócio dele.
  const IDEIA = "Boa! {ideia}\n\n{gancho_data}Antes de te mostrar como ficaria para a {nome}, me conta: {pergunta}{exemplos}";


  // Melhor canal por setor: chance de abrir conversa a cada 100 leads (estimativa de partida).
  // Base: WhatsApp personalizado no B2B brasileiro responde perto de 15 a 20% (lista qualificada);
  // ligação fria chega ao decisor em cerca de 1 a cada 4 empresas (Belkins 2026) e o sucesso médio é
  // baixo (Cognism 2026: 2,7%); combinar canais aumenta o contato em 3 a 4 vezes. O ajuste por setor
  // vem de quem atende: dono com a mão ocupada (oficina, obra) atende o celular e não digita; salão e
  // clínica vivem no WhatsApp e a recepção barra ligação. Com 10 envios ou mais por canal num setor,
  // os seus números substituem a estimativa.
  const CANAIS = {
    "Saúde": { msg: 0.14, lig: 0.07, quem: "A recepção lê o WhatsApp; ligando, você raramente passa da recepção.",
      ligar: "12h às 14h, fora do horário de consultas", combo: "Mensagem primeiro; se não responder em 2 dias, ligue no almoço e peça para falar com quem cuida da agenda." },
    "Beleza": { msg: 0.2, lig: 0.06, quem: "A dona vive no WhatsApp e no direct, mas não atende telefone com cliente na cadeira.",
      ligar: "9h às 10h, antes da primeira cliente", combo: "Fique na mensagem e no direct. Ligue só se ela pedir." },
    "Restaurantes e bares": { msg: 0.12, lig: 0.1, quem: "O dono lê mensagem entre o almoço e o jantar; ligando nesse intervalo, o gerente costuma atender.",
      ligar: "15h às 17h, entre o almoço e o jantar", combo: "Mensagem de manhã; sem resposta, ligue no mesmo dia às 15h citando a mensagem." },
    "Padarias e cafés": { msg: 0.11, lig: 0.12, quem: "O dono fica no balcão e atende o telefone da loja; mensagem demora a ser lida.",
      ligar: "9h30 às 11h, depois do pico da manhã", combo: "Ligue primeiro e mande a mensagem logo depois, para ele ter por escrito." },
    "Academias e estúdios": { msg: 0.16, lig: 0.09, quem: "Recepção e dono respondem bem o WhatsApp fora dos horários de treino.",
      ligar: "10h às 12h ou 14h às 16h", combo: "Mensagem primeiro; ligação só como segundo lembrete." },
    "Pet": { msg: 0.18, lig: 0.1, quem: "Atendem muito pelo WhatsApp, que já é onde marcam banho e tosa.",
      ligar: "9h às 11h", combo: "Mensagem primeiro; se não responder, ligue no terceiro dia." },
    "Imobiliário": { msg: 0.17, lig: 0.16, quem: "Corretor vive de telefone e de WhatsApp; atende os dois.",
      ligar: "9h às 12h; fim de tarde é de visita", combo: "Mensagem e ligação no mesmo dia: mande a mensagem e ligue 1 hora depois." },
    "Turismo e hospedagem": { msg: 0.15, lig: 0.1, quem: "Pousada responde WhatsApp o dia todo; telefone fica com quem está no balcão.",
      ligar: "segunda a quinta, 10h às 12h", combo: "Mensagem primeiro; ligação só fora de feriado e fim de semana." },
    "Escritórios": { msg: 0.11, lig: 0.13, quem: "Advogado e contador confiam mais em ligação ou e-mail; WhatsApp frio parece spam.",
      ligar: "9h às 11h ou 14h às 16h", combo: "Ligue e peça o e-mail ou o WhatsApp para mandar o material. A mensagem vem depois da conversa." },
    "Automotivo": { msg: 0.12, lig: 0.17, quem: "O dono está com a mão na graxa: atende o telefone, mas não digita.",
      ligar: "7h30 às 9h, no almoço ou ao fechar", combo: "Ligue primeiro; mande a mensagem no fim do dia com o resumo." },
    "Obras e serviços": { msg: 0.13, lig: 0.19, quem: "Está em campo o dia todo e atende o celular, porque cada ligação pode ser um serviço.",
      ligar: "7h às 8h30 ou 12h às 13h30", combo: "Ligue primeiro; mensagem só para mandar exemplos depois da conversa." },
    "Lojas": { msg: 0.15, lig: 0.08, quem: "O WhatsApp da loja é lido pelo dono ou pela vendedora; telefone fixo quase ninguém atende.",
      ligar: "9h às 10h30, antes do movimento", combo: "Mensagem; se não responder, passe na loja ou ligue no terceiro dia." },
    "Educação": { msg: 0.12, lig: 0.11, quem: "A secretaria atende os dois, mas quem decide é a direção: peça o melhor horário dela.",
      ligar: "9h às 11h, fora da entrada e saída dos alunos", combo: "Ligue para a secretaria, descubra o nome de quem decide e mande a mensagem para essa pessoa." },
    "Eventos": { msg: 0.18, lig: 0.11, quem: "Buffet e fotógrafo respondem rápido no WhatsApp; é por lá que chegam os orçamentos.",
      ligar: "segunda a quarta, 10h às 12h", combo: "Mensagem primeiro; se não responder em 3 dias, uma ligação curta no começo da semana." },
    "Outros": { msg: 0.13, lig: 0.1, quem: "Sem regra clara para o setor: comece pela mensagem e acompanhe os seus números.",
      ligar: "9h às 11h ou 14h às 16h", combo: "Mensagem primeiro; se não responder em 2 dias, ligue." },
  };
  const NOME_CANAL_ABRE = { msg: "Mensagem", lig: "Ligação", combo: "Mensagem + ligação" };
  // Combinação: a ligação alcança parte de quem não respondeu à mensagem.
  const comboDe = (m, l) => Math.min(0.6, m + (1 - m) * l * 0.85);
  const ehLigacao = (c) => c === "telefone";

  // Ranking por canal. leads: todos os leads (para usar os seus números quando houver).
  function rankingCanais(leads = []) {
    const reais = {};
    for (const l of leads) {
      const c = (l.dados && l.dados.ciclo) || {}, env = c.envios || [], resp = c.respostas || [];
      if (!env.length) continue;
      const tipo = setorDe(l.nicho || l.categoria);
      const r = (reais[tipo] ||= { msg: [0, 0], lig: [0, 0], combo: [0, 0] });
      const usou = { msg: env.some((e) => e.canal && !ehLigacao(e.canal)), lig: env.some((e) => ehLigacao(e.canal)) };
      const respondeu = resp.length > 0 || ["respondeu", "negociando", "fechado"].includes(l.status);
      const k = usou.msg && usou.lig ? "combo" : usou.lig ? "lig" : usou.msg ? "msg" : null;
      if (!k) continue;
      r[k][0]++; if (respondeu) r[k][1]++;
    }
    const lista = Object.keys(CANAIS).filter((t) => t !== "Outros").map((tipo) => {
      const c = CANAIS[tipo], R = reais[tipo] || { msg: [0, 0], lig: [0, 0], combo: [0, 0] };
      const ref = { msg: c.msg, lig: c.lig, combo: comboDe(c.msg, c.lig) };
      const taxa = {}, fonte = {};
      for (const k of ["msg", "lig", "combo"]) {
        const [n, ok] = R[k];
        taxa[k] = n >= 10 ? ok / n : ref[k]; fonte[k] = n >= 10 ? `seus ${n} envios` : "estimativa";
      }
      const melhor = taxa.lig > taxa.msg * 1.05 ? "lig" : "msg";
      const exemplos = (V() && (V().ROTINA_NICHO || []).find((r) => r.tipo === tipo)?.exemplos) || [];
      return { tipo, exemplos, taxa, fonte, melhor, melhorNome: NOME_CANAL_ABRE[melhor], ...c };
    });
    lista.forEach((x) => { x.ganho = x.taxa.combo - Math.max(x.taxa.msg, x.taxa.lig); });
    const por = (k) => [...lista].sort((a, b) => b.taxa[k] - a.taxa[k]);
    // Na combinação, vem primeiro quem mais ganha ao somar a ligação (não só quem tem a maior taxa).
    return { msg: por("msg"), lig: por("lig"), combo: [...lista].sort((a, b) => b.ganho - a.ganho), lista };
  }
  function canalDoNicho(nicho, leads = []) {
    const t = setorDe(nicho);
    return rankingCanais(leads).lista.find((x) => x.tipo === t) || { tipo: t, ...CANAIS.Outros, taxa: { msg: CANAIS.Outros.msg, lig: CANAIS.Outros.lig, combo: comboDe(CANAIS.Outros.msg, CANAIS.Outros.lig) }, melhor: "msg", melhorNome: "Mensagem", fonte: {} };
  }

  // Roteiro de ligação: curto, para falar e não para ler. Mesma lógica da mensagem: quem sou, por que liguei, um convite.
  const LIGACAO = "{oi_fala} Falo com o responsável pela {nome}?\n\n{apresento} sites para {categorias} {em_cidade}. Liguei rapidinho porque {motivo_fala}\n\nVocê tem um minuto agora, ou prefere que eu te mande pelo WhatsApp e você vê com calma?\n\n(Se não for a pessoa certa: \"Qual o melhor horário para falar com quem cuida disso, e o nome dela?\")";

  // Respostas do meio da conversa: as mesmas para todos, com a dor do setor entrando no texto.
  const RESPOSTAS = {
    atencao: "Claro! Eu olho como a {nome} aparece hoje no Google e no celular e te mando um diagnóstico curto, de graça, focado em {dor_curta}. " +
      "Se fizer sentido, te passo uma proposta fechada, com prazo ({prazo}) e valor.{portfolio_frase2}{exemplos}\n\nPosso fazer?",
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
    const g = ["desejo", "follow2"].includes(etapa) ? ganchoData(ctx, nicho, est.tipo) : { txt: "" };
    const nome = perfil.nome;
    const extra = {
      oi: saudacao(hora.h),
      apresento: nome ? `Meu nome é ${nome} e faço` : perfil.marca ? `Aqui é da ${perfil.marca}, faço` : "Eu faço",
      obs: ["crm", "app"].includes(vars.op_id) ? `Vi que a ${vars.nome} já tem uma presença forte no Google, com ${vars.avaliacoes} avaliações.`
        : vars.problema ? `Uma coisa que reparei: ${vars.problema}.` : "",
      gancho_data: g.txt, fecho_dia: ["abordagem", "follow1", "follow2"].includes(etapa) ? fechoDia(ctx, hora) : "",
      dor_curta: est.dor_curta,
      obs_curta: ["crm", "app"].includes(vars.op_id) ? `Vi que vocês já têm uma presença forte por lá, com ${vars.avaliacoes} avaliações. `
        : vars.problema ? `${vars.problema.charAt(0).toUpperCase()}${vars.problema.slice(1)}. ` : "",
      ...(CONVERSA[est.tipo] || CONVERSA.Outros),
    };
    extra.sobre_convite = extra.obs_curta ? "sobre isso" : extra.sobre;
    extra.oi_fala = saudacao(hora.h).replace(", tudo bem?", "!");
    extra.motivo_fala = vars.problema ? `${vars.problema}. Tenho uma ideia ${extra.sobre} e queria te contar em 1 minuto.`
      : `tenho uma ideia ${extra.sobre} da ${vars.nome} e queria te contar em 1 minuto.`;
    const todas = { ...vars, ...extra };
    let modelo = null;
    if (etapa === "abordagem") modelo = ABERTURA;
    else if (etapa === "desejo") modelo = IDEIA;
    else if (etapa === "follow1") modelo = LEMBRETE;
    else if (etapa === "ligacao") modelo = LIGACAO;
    else if (est.msgs[etapa]) { const lista = est.msgs[etapa]; modelo = lista[hash(`${l.id || l.nome}|${etapa}`) % lista.length]; }
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

  window.Estrategias = { SETORES, RESPOSTAS, CANAIS, rankingCanais, canalDoNicho, LIGACAO, CONVERSA, ABERTURA, IDEIA, LEMBRETE, doNicho, setorDe, texto, sequencia, diasDaSemana, localDoLead };
})();

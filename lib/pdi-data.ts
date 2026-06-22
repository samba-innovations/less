/**
 * Configuração de dimensões, atividades e metas para PDI
 * Baseado em documentação oficial SEDUC
 */

export interface AtividadePdi {
  id: string;
  titulo: string;
  detalhamento: string;
}

export interface Dimensao {
  codigo: number;
  nome: string;
  atividades: AtividadePdi[];
  metas: string[];
}

export const DIMENSOES_PDI: Record<number, Dimensao> = {
  1: {
    codigo: 1,
    nome: "Planejamento",
    atividades: [
      {
        id: "plan_1",
        titulo: "Planejamento reverso com foco em evidências",
        detalhamento:
          "Estruturar as aulas partindo das habilidades do Currículo Paulista e definindo previamente quais evidências (atividades, registros, produções) indicarão que o aluno aprendeu.",
      },
      {
        id: "plan_2",
        titulo: "Uso sistemático de avaliação diagnóstica",
        detalhamento:
          "Aplicar instrumentos iniciais (questionários, sondagens, exercícios) para identificar lacunas e ajustar o planejamento da turma e de grupos específicos.",
      },
      {
        id: "plan_3",
        titulo: "Sequência didática contextualizada",
        detalhamento:
          "Organizar conteúdos em sequência lógica conectada a situações reais ou problemas, favorecendo a compreensão e aplicação prática do conhecimento.",
      },
      {
        id: "plan_4",
        titulo: "Diferenciação pedagógica no planejamento",
        detalhamento:
          "Prever atividades com diferentes níveis de complexidade, garantindo acesso ao conteúdo para alunos com ritmos e níveis distintos.",
      },
      {
        id: "plan_5",
        titulo: "Integração curricular (interdisciplinaridade)",
        detalhamento:
          "Planejar ações articuladas com outros componentes, promovendo projetos ou atividades integradas.",
      },
    ],
    metas: [
      "Garantir que 100% das aulas planejadas estejam alinhadas às habilidades do Currículo Paulista, com definição prévia de objetivos e evidências de aprendizagem.",
      "Ampliar a efetividade do planejamento, assegurando a adequação das atividades aos diferentes níveis de aprendizagem da turma.",
      "Consolidar o uso de diagnósticos para replanejamento, evidenciando ajustes pedagógicos ao longo do bimestre.",
    ],
  },

  2: {
    codigo: 2,
    nome: "Práticas pedagógicas",
    atividades: [
      {
        id: "pract_1",
        titulo: "Metodologias ativas com protagonismo estudantil",
        detalhamento:
          "Desenvolver aulas em que o aluno investiga, resolve problemas, produz e participa ativamente, reduzindo centralidade da exposição.",
      },
      {
        id: "pract_2",
        titulo: "Experimentação de baixo custo",
        detalhamento:
          "Utilizar materiais simples e acessíveis para promover aprendizagem prática, especialmente em Ciências da Natureza.",
      },
      {
        id: "pract_3",
        titulo: "Rotação por estações de aprendizagem",
        detalhamento:
          "Organizar a aula em diferentes atividades simultâneas (exercício, leitura, prática, mediação), permitindo personalização do ensino.",
      },
      {
        id: "pract_4",
        titulo: "Mediação por questionamento",
        detalhamento:
          "Conduzir a aula por meio de perguntas orientadoras que levem o aluno a refletir, argumentar e construir o conhecimento.",
      },
      {
        id: "pract_5",
        titulo: "Ensino híbrido com uso intencional de tecnologia",
        detalhamento:
          "Combinar momentos presenciais com recursos digitais (vídeos, plataformas, simuladores), com objetivos pedagógicos claros.",
      },
    ],
    metas: [
      "Elevar o nível de engajamento dos estudantes por meio da aplicação consistente de metodologias ativas em sala de aula.",
      "Diversificar as estratégias de ensino, garantindo ao menos uma prática diferenciada por sequência didática.",
      "Promover maior protagonismo estudantil, evidenciado pela participação ativa dos alunos nas atividades propostas.",
    ],
  },

  3: {
    codigo: 3,
    nome: "Avaliação da aprendizagem",
    atividades: [
      {
        id: "aval_1",
        titulo: "Avaliação formativa contínua",
        detalhamento:
          "Acompanhar a aprendizagem ao longo do processo, oferecendo devolutivas frequentes e ajustando o ensino conforme necessário.",
      },
      {
        id: "aval_2",
        titulo: "Uso de rubricas avaliativas",
        detalhamento:
          "Estabelecer critérios claros de avaliação, compartilhados com os alunos, para orientar o desempenho esperado.",
      },
      {
        id: "aval_3",
        titulo: "Autoavaliação orientada",
        detalhamento:
          "Propor momentos estruturados para que o aluno reflita sobre sua própria aprendizagem.",
      },
      {
        id: "aval_4",
        titulo: "Análise de erros como estratégia pedagógica",
        detalhamento:
          "Utilizar os erros dos alunos como ponto de partida para intervenção e aprofundamento conceitual.",
      },
      {
        id: "aval_5",
        titulo: "Portfólio de aprendizagem",
        detalhamento:
          "Registrar e acompanhar produções ao longo do tempo para evidenciar evolução.",
      },
    ],
    metas: [
      "Implementar avaliação formativa contínua, com devolutivas sistemáticas aos estudantes durante o processo de aprendizagem.",
      "Aprimorar os instrumentos avaliativos, garantindo alinhamento com as habilidades previstas e critérios claros de desempenho.",
      "Utilizar os resultados das avaliações para replanejamento, evidenciando intervenções pedagógicas direcionadas.",
    ],
  },

  4: {
    codigo: 4,
    nome: "Gestão da sala de aula",
    atividades: [
      {
        id: "gest_1",
        titulo: "Estabelecimento de rotinas estruturadas",
        detalhamento:
          "Definir início, desenvolvimento e fechamento das aulas com previsibilidade e organização.",
      },
      {
        id: "gest_2",
        titulo: "Estratégias de engajamento ativo",
        detalhamento:
          "Promover participação constante por meio de perguntas, atividades e interações.",
      },
      {
        id: "gest_3",
        titulo: "Construção de combinados com a turma",
        detalhamento:
          "Definir regras de convivência de forma coletiva, fortalecendo o compromisso dos alunos.",
      },
      {
        id: "gest_4",
        titulo: "Organização do tempo pedagógico",
        detalhamento:
          "Distribuir adequadamente o tempo entre explicação, prática e retomada.",
      },
      {
        id: "gest_5",
        titulo: "Intervenção pedagógica em comportamentos",
        detalhamento:
          "Atuar de forma imediata e educativa frente a situações de indisciplina, mantendo o foco na aprendizagem.",
      },
    ],
    metas: [
      "Estabelecer rotinas estruturadas que favoreçam o uso eficiente do tempo pedagógico em todas as aulas.",
      "Reduzir ocorrências de indisciplina por meio de estratégias de mediação e organização da sala.",
      "Aumentar o nível de participação dos estudantes, promovendo um ambiente de aprendizagem mais ativo e organizado.",
    ],
  },

  5: {
    codigo: 5,
    nome: "Uso de dados educacionais",
    atividades: [
      {
        id: "dado_1",
        titulo: "Análise de resultados de avaliações",
        detalhamento:
          "Interpretar dados de provas internas e externas para identificar dificuldades.",
      },
      {
        id: "dado_2",
        titulo: "Uso de plataformas institucionais",
        detalhamento:
          "Utilizar ferramentas da SEDUC para monitoramento da aprendizagem.",
      },
      {
        id: "dado_3",
        titulo: "Agrupamento produtivo de alunos",
        detalhamento:
          "Organizar grupos com base no nível de aprendizagem para intervenções específicas.",
      },
      {
        id: "dado_4",
        titulo: "Monitoramento de indicadores de evolução",
        detalhamento:
          "Acompanhar o progresso dos alunos ao longo do tempo.",
      },
      {
        id: "dado_5",
        titulo: "Replanejamento com base em evidências",
        detalhamento:
          "Ajustar estratégias pedagógicas a partir dos dados coletados.",
      },
    ],
    metas: [
      "Utilizar sistematicamente dados de avaliações para orientar o planejamento e as intervenções pedagógicas.",
      "Monitorar a evolução dos estudantes com base em indicadores de aprendizagem ao longo do bimestre.",
      "Consolidar práticas de ensino baseadas em evidências, com registro de análises e tomadas de decisão pedagógica.",
    ],
  },

  6: {
    codigo: 6,
    nome: "Clima escolar e relações",
    atividades: [
      {
        id: "clima_1",
        titulo: "Check-in socioemocional estruturado",
        detalhamento:
          "Realizar momentos periódicos de escuta para compreender o estado emocional dos alunos.",
      },
      {
        id: "clima_2",
        titulo: "Tutoria individualizada (PEI)",
        detalhamento:
          "Acompanhar estudantes de forma mais próxima, orientando questões acadêmicas e pessoais.",
      },
      {
        id: "clima_3",
        titulo: "Rodas de conversa mediadas",
        detalhamento:
          "Promover espaços de fala e escuta com intencionalidade pedagógica.",
      },
      {
        id: "clima_4",
        titulo: "Mediação de conflitos com abordagem restaurativa",
        detalhamento:
          "Resolver conflitos por meio do diálogo e responsabilização.",
      },
      {
        id: "clima_5",
        titulo: "Fortalecimento do vínculo pedagógico",
        detalhamento:
          "Desenvolver relação de confiança que favoreça o engajamento do aluno.",
      },
    ],
    metas: [
      "Fortalecer o vínculo com os estudantes, promovendo um ambiente de respeito, escuta e confiança.",
      "Ampliar a participação dos alunos nas atividades escolares por meio de práticas de escuta e mediação.",
      "Reduzir conflitos em sala de aula, promovendo estratégias de convivência e resolução pacífica de problemas.",
    ],
  },

  7: {
    codigo: 7,
    nome: "Desenvolvimento profissional",
    atividades: [
      {
        id: "prof_1",
        titulo: "Participação qualificada em ATPC",
        detalhamento:
          "Contribuir ativamente com discussões pedagógicas baseadas na prática.",
      },
      {
        id: "prof_2",
        titulo: "Autoavaliação docente orientada",
        detalhamento:
          "Refletir sobre a própria prática com base em evidências.",
      },
      {
        id: "prof_3",
        titulo: "Testagem de novas estratégias pedagógicas",
        detalhamento:
          "Aplicar metodologias diferentes e avaliar seus resultados.",
      },
      {
        id: "prof_4",
        titulo: "Formação continuada alinhada à prática",
        detalhamento:
          "Buscar cursos e estudos conectados às demandas reais da sala de aula.",
      },
      {
        id: "prof_5",
        titulo: "Registro reflexivo da prática",
        detalhamento:
          "Documentar experiências para análise e melhoria contínua.",
      },
    ],
    metas: [
      "Participar ativamente das formações pedagógicas, aplicando os conhecimentos adquiridos na prática docente.",
      "Desenvolver postura reflexiva sobre a própria prática, com registros e ajustes contínuos.",
      "Incorporar novas estratégias pedagógicas, evidenciando inovação e melhoria na prática docente.",
    ],
  },

  8: {
    codigo: 8,
    nome: "Trabalho colaborativo",
    atividades: [
      {
        id: "colab_1",
        titulo: "Planejamento coletivo",
        detalhamento:
          "Construir planos de aula e avaliações em conjunto com outros professores.",
      },
      {
        id: "colab_2",
        titulo: "Compartilhamento de práticas exitosas",
        detalhamento:
          "Socializar estratégias que funcionaram em sala.",
      },
      {
        id: "colab_3",
        titulo: "Projetos interdisciplinares",
        detalhamento:
          "Desenvolver ações integradas entre componentes curriculares.",
      },
      {
        id: "colab_4",
        titulo: "Alinhamento pedagógico entre turmas",
        detalhamento:
          "Garantir coerência no ensino entre diferentes classes.",
      },
      {
        id: "colab_5",
        titulo: "Participação em comunidades de prática",
        detalhamento:
          "Atuar em grupos de troca e aprendizagem entre professores.",
      },
    ],
    metas: [
      "Fortalecer o trabalho em equipe por meio da participação ativa em momentos coletivos de planejamento.",
      "Compartilhar práticas pedagógicas e contribuir para a melhoria do trabalho coletivo da escola.",
      "Desenvolver ações interdisciplinares que promovam integração entre componentes curriculares.",
    ],
  },
};

// Função helper para obter atividade por dimensão e ID
export function getAtividade(dimensaoCodigo: number, atividadeId: string): AtividadePdi | undefined {
  const dimensao = DIMENSOES_PDI[dimensaoCodigo];
  if (!dimensao) return undefined;
  return dimensao.atividades.find((a) => a.id === atividadeId);
}

// Função helper para obter todas as metas de uma dimensão
export function getMetasDimensao(dimensaoCodigo: number): string[] {
  return DIMENSOES_PDI[dimensaoCodigo]?.metas ?? [];
}

// Função helper para obter primeira meta como default
export function getMetaDefault(dimensaoCodigo: number): string {
  const metas = getMetasDimensao(dimensaoCodigo);
  return metas[0] ?? "";
}

// Opções de Objetivos Esperados e Evidências
export interface ObjetivoOpcao {
  categoria: string;
  opcoes: string[];
}

export const OBJETIVOS_OPCOES: ObjetivoOpcao[] = [
  {
    categoria: "Aprendizagem e cognição",
    opcoes: [
      "Promover a aprendizagem significativa, garantindo que os estudantes compreendam e apliquem os conceitos trabalhados.",
      "Desenvolver o raciocínio lógico e a capacidade de resolução de problemas em diferentes contextos.",
      "Estimular a autonomia intelectual dos estudantes no processo de aprendizagem.",
      "Favorecer a construção ativa do conhecimento por meio de práticas investigativas.",
      "Ampliar a capacidade de argumentação e pensamento crítico dos estudantes.",
    ],
  },
  {
    categoria: "Engajamento e protagonismo",
    opcoes: [
      "Elevar o nível de engajamento dos estudantes nas atividades propostas em sala de aula.",
      "Promover o protagonismo estudantil por meio da participação ativa nas atividades pedagógicas.",
      "Incentivar a participação colaborativa entre os estudantes.",
      "Desenvolver o senso de responsabilidade dos estudantes em relação ao próprio processo de aprendizagem.",
      "Ampliar a participação dos estudantes em atividades que envolvam tomada de decisão.",
    ],
  },
  {
    categoria: "Avaliação e melhoria contínua",
    opcoes: [
      "Utilizar a avaliação como instrumento de aprendizagem e não apenas de mensuração.",
      "Identificar e intervir de forma contínua nas dificuldades de aprendizagem dos estudantes.",
      "Promover a autorregulação da aprendizagem por meio de devolutivas qualificadas.",
      "Monitorar o progresso dos estudantes com base em evidências de aprendizagem.",
    ],
  },
  {
    categoria: "Clima escolar e relações",
    opcoes: [
      "Fortalecer vínculos positivos entre professor e estudantes.",
      "Promover um ambiente de aprendizagem seguro, acolhedor e respeitoso.",
      "Desenvolver habilidades socioemocionais que favoreçam a convivência escolar.",
    ],
  },
  {
    categoria: "Inovação e prática docente",
    opcoes: [
      "Incorporar metodologias ativas que favoreçam a participação e o protagonismo dos estudantes.",
      "Integrar o uso de tecnologias digitais de forma intencional ao processo de ensino-aprendizagem.",
      "Aprimorar continuamente a prática pedagógica com base em reflexão e evidências.",
    ],
  },
];

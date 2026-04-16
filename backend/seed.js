require('dotenv').config();
const { connectDB, sequelize } = require('./src/config/db');
const { WorkflowDefinition } = require('./src/models');

const seedWorkflows = async () => {
  await connectDB();

  const workflows = [
    {
      name: 'AvanceCaisse',
      description: 'Demande d avance sur caisse avec passage conditionnel DCC/DCRH',
      steps: [
        { name: 'Avis N+1', order: 0, actorType: 'hierarchy', actorValue: 'N+1', actions: ['validate', 'reject', 'return'], requiredFields: ['societe', 'montant', 'motif', 'choixCaisse'] },
        // Diagram rule:
        // - montant > 1000 => DCC -> DCRH -> Caissier
        // - montant <= 1000 => direct Caissier
        { name: 'Avis DCF', order: 1, actorType: 'role', actorValue: 'DCF', actions: ['validate', 'reject', 'return'], conditions: [{ field: 'montant', operator: '<=', value: 1000, nextStepIndex: 4 }] },
        { name: 'Cosignataire DCC', order: 2, actorType: 'role', actorValue: 'DCC', actions: ['validate', 'reject', 'return'] },
        { name: 'Avis DCRH', order: 3, actorType: 'role', actorValue: 'DCRH', actions: ['validate', 'reject', 'return'] },
        { name: 'Décaissement caissier', order: 4, actorType: 'role', actorValue: 'CAISSIER', actions: ['validate', 'reject', 'return'], requiredFields: ['numeroPieceComptable'] },
        { name: 'Justification demandeur', order: 5, actorType: 'hierarchy', actorValue: 'N', actions: ['validate', 'return'], requiredAttachments: true },
        { name: 'Comptabilisation finale caissier', order: 6, actorType: 'role', actorValue: 'CAISSIER', actions: ['validate'], isFinal: true },
      ],
    },
    {
      name: 'CreationClient',
      description: 'Création client avec validations multiples',
      steps: [
        { name: 'Validation DCC', order: 0, actorType: 'role', actorValue: 'DCC', actions: ['validate', 'reject', 'return'] },
        {
          name: 'Avis service recouvrement',
          order: 1,
          actorType: 'role',
          actorValue: 'SERVICE_RECOUVREMENT',
          actions: ['validate', 'reject', 'return'],
          requiredFields: ['recouvrementPlafond'],
        },
        {
          name: 'Avis service fiscal',
          order: 2,
          actorType: 'role',
          actorValue: 'SERVICE_FISCAL',
          actions: ['validate', 'reject', 'return'],
          requiredFields: ['compteCollectif'],
        },
        {
          name: 'Validation DCF',
          order: 3,
          actorType: 'role',
          actorValue: 'DCF',
          actions: ['validate', 'reject', 'return'],
          requiredFields: ['groupeTresorerie'],
        },
        {
          name: 'Création client SAP (DSI)',
          order: 4,
          actorType: 'role',
          actorValue: 'DSI',
          actions: ['validate'],
          requiredFields: ['codeClient'],
          isFinal: true,
        },
      ],
    },
    {
      name: 'Investissement',
      description: 'Demande d investissement avec avis DG si >100k EUR',
      steps: [
        { name: 'Avis N+1', order: 0, actorType: 'hierarchy', actorValue: 'N+1', actions: ['validate', 'reject', 'return'] },
        { name: 'Avis directeur investissement', order: 1, actorType: 'role', actorValue: 'DIRECTEUR_INVESTISSEMENT', actions: ['validate', 'reject', 'return'], conditions: [
          { field: 'categorie', operator: '==', value: 'Industriel SF', nextStepIndex: 2 },
          { field: 'categorie', operator: '==', value: 'Industriel SK', nextStepIndex: 3 },
          { field: 'categorie', operator: '==', value: 'Moyens Generaux', nextStepIndex: 4 },
          { field: 'categorie', operator: '==', value: 'IT', nextStepIndex: 5 },
        ] },
        { name: 'Avis DCU SF', order: 2, actorType: 'role', actorValue: 'DCU_SF', actions: ['validate', 'reject', 'return'] },
        { name: 'Avis DCU SK', order: 3, actorType: 'role', actorValue: 'DCU_SK', actions: ['validate', 'reject', 'return'] },
        { name: 'Avis DCRH', order: 4, actorType: 'role', actorValue: 'DCRH', actions: ['validate', 'reject', 'return'] },
        { name: 'Avis DSI', order: 5, actorType: 'role', actorValue: 'DSI', actions: ['validate', 'reject', 'return'] },
        { name: 'Validation HoF', order: 6, actorType: 'role', actorValue: 'HOF_IT', actions: ['validate', 'reject', 'return'] },
        { name: 'Avis groupe / contrôle gestion', order: 7, actorType: 'role', actorValue: 'DIRECTEUR_CG', actions: ['validate', 'reject', 'return'], conditions: [{ field: 'requestMontant', operator: '>', value: 100000, nextStepIndex: 8 }] },
        { name: 'Avis DG (si > 100k)', order: 8, actorType: 'role', actorValue: 'DG', actions: ['validate', 'reject', 'return'] },
        { name: 'Validation CFO', order: 9, actorType: 'role', actorValue: 'CFO_GROUPE', actions: ['validate', 'reject', 'return'] },
        { name: 'Création OI', order: 10, actorType: 'role', actorValue: 'DIRECTEUR_CG', actions: ['validate'], isFinal: true },
      ],
    },
    {
      name: 'AvisTechnique',
      description: 'Validation technique sur N, N+1 ou N+2 selon choix',
      steps: [
        { name: 'Avis N', order: 0, actorType: 'hierarchy', actorValue: 'N', actions: ['validate', 'reject', 'return'], conditions: [{ field: 'niveauValidation', operator: '==', value: 'N', nextStepIndex: 3 }] },
        { name: 'Avis N+1', order: 1, actorType: 'hierarchy', actorValue: 'N+1', actions: ['validate', 'reject', 'return'], conditions: [{ field: 'niveauValidation', operator: '==', value: 'N+1', nextStepIndex: 3 }] },
        { name: 'Avis N+2', order: 2, actorType: 'hierarchy', actorValue: 'N+2', actions: ['validate', 'reject', 'return'] },
        { name: 'Validation financière / offres', order: 3, actorType: 'role', actorValue: 'DCF', actions: ['validate'], isFinal: true },
      ],
    },
  ];

  for (const wf of workflows) {
    const exists = await WorkflowDefinition.findOne({ where: { name: wf.name } });
    if (!exists) {
      await WorkflowDefinition.create(wf);
      console.log(`✅ Workflow ${wf.name} créé`);
      continue;
    }

    await exists.update({
      description: wf.description,
      steps: wf.steps,
    });
    console.log(`🔄 Workflow ${wf.name} mis à jour`);
  }

  await sequelize.close();
  process.exit(0);
};

seedWorkflows();
// The sandboxed surface uses only consented host actions. No credentials or arbitrary fetches.
import {connectCommerce} from '/sdk.js';
const sdk=await connectCommerce();
const words={
heading:['Shopware environments','Shopware-Umgebungen','Environnements Shopware','Entornos Shopware'],
intro:['Manage extensions in your own original Shopware runtime. Each environment has its own database and files.','Verwalte Erweiterungen in deiner originalen Shopware-Laufzeit. Jede Umgebung hat eigene Daten und Dateien.','Gérez les extensions dans votre environnement Shopware original, avec ses propres données et fichiers.','Gestiona extensiones en tu entorno Shopware original, con sus propios datos y archivos.'],
environment:['Environment','Umgebung','Environnement','Entorno'],refresh:['Refresh','Aktualisieren','Actualiser','Actualizar'],extensions:['Your extensions','Deine Erweiterungen','Vos extensions','Tus extensiones'],name:['Name','Name','Nom','Nombre'],type:['Type','Typ','Type','Tipo'],version:['Version','Version','Version','Versión'],state:['Status','Status','État','Estado'],actions:['Actions','Aktionen','Actions','Acciones'],
empty:['No extensions found. Stage an approved package in this environment first.','Noch keine Erweiterungen vorhanden. Stelle zuerst ein geprüftes Paket in dieser Umgebung bereit.','Aucune extension. Déployez d’abord un paquet validé dans cet environnement.','No hay extensiones. Despliega primero un paquete aprobado en este entorno.'],
original:['Open the original Shopware','Originales Shopware öffnen','Ouvrir Shopware original','Abrir Shopware original'],originalHint:['Copy an address into a new browser tab. Templates, administration extensions and checkout plugins run in this Shopware environment.','Kopiere eine Adresse in einen neuen Browser-Tab. Templates, Verwaltungserweiterungen und Checkout-Plugins laufen in dieser Shopware-Umgebung.','Copiez une adresse dans un nouvel onglet. Les templates, extensions et le paiement fonctionnent dans cet environnement Shopware.','Copia una dirección en otra pestaña. Las plantillas, extensiones y el checkout funcionan en este entorno Shopware.'],admin:['Administration','Verwaltung','Administration','Administración'],storefront:['Shop','Shop','Boutique','Tienda'],
history:['Recent changes','Letzte Änderungen','Changements récents','Cambios recientes'],historyHint:['A pending result keeps the environment locked until it has been reconciled.','Ein ungeklärtes Ergebnis sperrt die Umgebung bis zur Klärung.','Un résultat incertain bloque l’environnement jusqu’à sa vérification.','Un resultado incierto bloquea el entorno hasta su comprobación.'],
keepData:['Uninstalling keeps the extension’s stored data. Review the extension in its original shop after each change.','Beim Deinstallieren bleiben die gespeicherten Erweiterungsdaten erhalten. Prüfe die Erweiterung nach der Änderung im originalen Shop.','La désinstallation conserve les données. Vérifiez ensuite l’extension dans la boutique originale.','La desinstalación conserva los datos. Comprueba después la extensión en la tienda original.'],
cancel:['Cancel','Abbrechen','Annuler','Cancelar'],approve:['Run reviewed change','Geprüfte Änderung ausführen','Exécuter le changement','Ejecutar el cambio'],
install:['Install','Installieren','Installer','Instalar'],activate:['Activate','Aktivieren','Activer','Activar'],deactivate:['Deactivate','Deaktivieren','Désactiver','Desactivar'],update:['Update','Aktualisieren','Mettre à jour','Actualizar'],uninstall:['Uninstall','Deinstallieren','Désinstaller','Desinstalar'],
active:['Active','Aktiv','Active','Activa'],inactive:['Inactive','Inaktiv','Inactive','Inactiva'],staged:['Ready to install','Bereit zur Installation','Prête à installer','Lista para instalar'],search:['Find an extension','Erweiterung suchen','Chercher une extension','Buscar extensión'],loading:['Loading…','Wird geladen …','Chargement…','Cargando…'],
queued:['Change queued. Refresh to inspect the result. Job: ','Änderung beauftragt. Aktualisiere, um das Ergebnis zu prüfen. Auftrag: ','Changement en attente. Actualisez pour vérifier. Tâche : ','Cambio en cola. Actualiza para comprobar. Tarea: '],
started:['Pending confirmation','Bestätigung ausstehend','Confirmation attendue','Confirmación pendiente'],acknowledged:['Confirmed by Shopware','Von Shopware bestätigt','Confirmé par Shopware','Confirmado por Shopware'],
none:['No environments configured for this shop.','Für diesen Shop ist noch keine Umgebung eingerichtet.','Aucun environnement configuré pour cette boutique.','No hay entornos configurados para esta tienda.']
};
const t=k=>sdk.uiText(Object.fromEntries(['en','de','fr','es'].map((l,i)=>[l,words[k]?.[i]??k])));
const $=s=>document.querySelector(s);
document.documentElement.lang=sdk.locale;
document.querySelectorAll('[data-t]').forEach(e=>e.textContent=t(e.dataset.t));
$('#search').placeholder=t('search');$('#search').setAttribute('aria-label',t('search'));
let cells=[],inventory,review;
function status(text,bad=false){$('#status').textContent=text;$('#status').classList.toggle('error',bad);sdk.resize(document.body.scrollHeight+40);}
async function perform(fn){try{await fn();}catch(e){status(e.message,true);}}
function render(){
 const rows=inventory?.snapshot.extensions??[],query=$('#search').value.toLowerCase();$('#rows').replaceChildren();
 for(const row of rows.filter(r=>r.name.toLowerCase().includes(query))){
  const tr=document.createElement('tr');
  for(const value of [row.name,row.kind,row.version,t(row.active?'active':row.installedAt||row.kind==='app'?'inactive':'staged')]){const td=document.createElement('td');td.textContent=value;tr.append(td);}
  const td=document.createElement('td');
  const operations=row.kind==='plugin'&&!row.installedAt?['install']:[row.active?'deactivate':'activate','update','uninstall'];
  for(const operation of operations){const b=document.createElement('button');b.textContent=t(operation);b.onclick=()=>perform(async()=>{
   b.disabled=true;try{review=await sdk.action('prepare',{cellId:$('#cell').value,kind:row.kind,name:row.name,operation,revision:inventory.revision});$('#review-title').textContent=t(operation)+' · '+row.name;$('#review-copy').textContent=t('environment')+': '+$('#cell').value+' ('+review.environment+')';$('#review').showModal();}finally{b.disabled=false;}
  });td.append(b);}tr.append(td);$('#rows').append(tr);
 }$('#empty').hidden=rows.length>0;sdk.resize(document.body.scrollHeight+40);
}
async function refresh(){
 const cell=cells.find(c=>c.id===$('#cell').value);if(!cell){status(t('none'));return;}
 status(t('loading'));$('#refresh').disabled=true;
 try{
  inventory=await sdk.action('inspect',{cellId:cell.id});$('#version').textContent='Shopware '+inventory.snapshot.version;$('#environment').textContent=cell.environment;render();
  $('#addresses').replaceChildren();for(const [key,value] of [['admin',cell.adminUrl],['storefront',cell.storefrontUrl]]){const label=document.createElement('label');label.textContent=t(key);const input=document.createElement('input');input.readOnly=true;input.value=value;input.onclick=()=>input.select();label.append(input);$('#addresses').append(label);}
  const history=await sdk.action('list_effects',{filter:{cell:cell.id},limit:100});$('#history').replaceChildren();for(const row of history.elements){const li=document.createElement('li');li.textContent=[row.change?.name,t(row.change?.operation),t(row.state)].join(' · ');$('#history').append(li);}status('');
 }finally{$('#refresh').disabled=false;}
}
$('#refresh').onclick=()=>perform(refresh);$('#cell').onchange=()=>perform(refresh);$('#search').oninput=render;$('#cancel').onclick=()=>$('#review').close();
$('#approve').onclick=()=>perform(async()=>{const b=$('#approve');b.disabled=true;try{const job=await sdk.action('change',{change:review.change,approvalDigest:review.approvalDigest,approve:true});$('#review').close();status(t('queued')+job.jobId);}finally{b.disabled=false;}});
await perform(async()=>{cells=(await sdk.action('cells')).elements;for(const cell of cells){const option=document.createElement('option');option.value=cell.id;option.textContent=cell.id+' · '+cell.environment;$('#cell').append(option);}await refresh();});

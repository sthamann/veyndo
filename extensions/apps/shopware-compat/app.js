// The sandboxed surface uses only consented host actions. No credentials or arbitrary fetches.
import {connectCommerce} from '/sdk.js';
const sdk=await connectCommerce();
const words={
nativeHeading:['Translate a plugin','Plugin übersetzen','Traduire un plugin','Traducir plugin'],
nativeHint:['Select the complete plugin folder. The cart-percentage profile translates a single percentage processor; other contracts are reported with source locations. No source code is executed.','Wähle den vollständigen Plugin-Ordner. Das Profil übersetzt einen einzelnen prozentualen Warenkorbprozessor. Andere Verträge werden mit Datei und Zeile angezeigt. Der Quellcode wird nicht ausgeführt.','Sélectionnez le dossier complet. Le profil traduit un processeur de remise ; les autres contrats sont signalés avec leur emplacement. Aucun code source n’est exécuté.','Selecciona la carpeta completa. El perfil traduce un procesador de descuento; los demás contratos se muestran con su ubicación. No se ejecuta el código fuente.'],
sourceFolder:['Plugin folder','Plugin-Ordner','Dossier du plugin','Carpeta del plugin'],appId:['Veyndo app ID','Veyndo-App-ID','Identifiant Veyndo','ID de app Veyndo'],analyse:['Check and translate','Prüfen und übersetzen','Vérifier et traduire','Comprobar y traducir'],
packageHint:['Native package proposal. Select and copy for App Studio import, or ask your coding agent to import it into a private sandbox. Nothing has been installed.','Nativer Paketvorschlag. Zum Import in App Studio markieren und kopieren oder den Coding-Agenten mit dem Import in eine private Sandbox beauftragen. Es wurde nichts installiert.','Proposition native à copier pour importer dans App Studio ou via votre agent dans un bac à sable privé. Rien n’a été installé.','Propuesta nativa para copiar e importar en App Studio o con tu agente en un entorno privado. No se ha instalado nada.'],
translated:['Native proposal ready for review','Nativer Vorschlag bereit zur Prüfung','Proposition native à vérifier','Propuesta nativa lista'],blocked:['Translation needs these additional contracts','Für die Übersetzung fehlen diese Verträge','Contrats supplémentaires requis','Faltan estos contratos'],
fileLimit:['Select up to 64 files, 32 KiB each. The complete encoded request must fit 64 KiB. Use the local compiler for larger packages.','Wähle bis zu 64 Dateien mit je 32 KiB. Die gesamte kodierte Anfrage darf 64 KiB nicht überschreiten. Nutze für größere Pakete den lokalen Compiler.','Maximum : 64 fichiers, 32 Kio chacun. La requête encodée doit rester sous 64 Kio. Utilisez le compilateur local pour les paquets plus grands.','Máximo: 64 archivos, 32 KiB cada uno. La solicitud codificada debe caber en 64 KiB. Usa el compilador local para paquetes mayores.'],
encoding:['Source files must use valid UTF-8. No source bytes were replaced.','Quelldateien müssen gültiges UTF-8 enthalten. Es wurden keine Quellbytes ersetzt.','Les fichiers doivent être en UTF-8 valide. Aucun octet source n’a été remplacé.','Los archivos deben usar UTF-8 válido. No se sustituyeron bytes de origen.'],

heading:['Shopware extensions','Shopware-Erweiterungen','Extensions Shopware','Extensiones Shopware'],
intro:['Bring supported Shopware logic into your native Veyndo shop. Inspect the source, review the proposal and test it privately before publishing.','Übernimm unterstützte Shopware-Logik in deinen Veyndo-Shop. Quellcode prüfen, Vorschlag ansehen und vor der Veröffentlichung privat testen.','Importez la logique Shopware prise en charge, examinez la proposition et testez-la en privé.','Importa la lógica compatible, revisa la propuesta y pruébala en privado.'],

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
 const cell=cells.find(c=>c.id===$('#cell').value);if(!cell){status('');return;}
 status(t('loading'));$('#refresh').disabled=true;
 try{
  inventory=await sdk.action('inspect',{cellId:cell.id});$('#version').textContent='Shopware '+inventory.snapshot.version;$('#environment').textContent=cell.environment;render();
  $('#addresses').replaceChildren();for(const [key,value] of [['admin',cell.adminUrl],['storefront',cell.storefrontUrl]]){const label=document.createElement('label');label.textContent=t(key);const input=document.createElement('input');input.readOnly=true;input.value=value;input.onclick=()=>input.select();label.append(input);$('#addresses').append(label);}
  const history=await sdk.action('list_effects',{filter:{cell:cell.id},limit:100});$('#history').replaceChildren();for(const row of history.elements){const li=document.createElement('li');li.textContent=[row.change?.name,t(row.change?.operation),t(row.state)].join(' · ');$('#history').append(li);}status('');
 }finally{$('#refresh').disabled=false;}
}
$('#refresh').onclick=()=>perform(refresh);$('#cell').onchange=()=>perform(refresh);$('#search').oninput=render;$('#cancel').onclick=()=>$('#review').close();
$('#approve').onclick=()=>perform(async()=>{const b=$('#approve');b.disabled=true;try{const job=await sdk.action('change',{change:review.change,approvalDigest:review.approvalDigest,approve:true});$('#review').close();status(t('queued')+job.jobId);}finally{b.disabled=false;}});
await perform(async()=>{cells=(await sdk.action('cells')).elements;$('#cell-controls').hidden=!cells.length;document.querySelectorAll('[data-cell-only]').forEach(e=>e.hidden=!cells.length);for(const cell of cells){const option=document.createElement('option');option.value=cell.id;option.textContent=cell.id+' · '+cell.environment;$('#cell').append(option);}await refresh();});

let nativeFiles={};
const nativeRequest=()=>({appId:$('#native-id').value,version:$('#native-version').value,files:nativeFiles});
function checkTransport(input){if(new TextEncoder().encode(JSON.stringify(input)).length>65536)throw new Error(t('fileLimit'));}
$('#source-folder').onchange=()=>perform(async()=>{
 $('#translate').disabled=true;$('#native-result').replaceChildren();$('#native-package-label').hidden=true;nativeFiles={};
 const files=Array.from($('#source-folder').files??[]);
 if(!files.length||files.length>64||files.some(f=>f.size>32768)||files.reduce((n,f)=>n+f.size,0)>262144)throw new Error(t('fileLimit'));
 for(const file of files){const path=file.webkitRelativePath.split('/').slice(1).join('/');if(!path||Object.hasOwn(nativeFiles,path))throw new Error(t('fileLimit'));try{nativeFiles[path]=new TextDecoder('utf-8',{fatal:true,ignoreBOM:true}).decode(await file.arrayBuffer());}catch{throw new Error(t('encoding'));}}
 checkTransport(nativeRequest());
 $('#native-files').textContent=files.length+' · '+t('sourceFolder')+': '+files[0].webkitRelativePath.split('/')[0];$('#translate').disabled=false;sdk.resize(document.body.scrollHeight+40);
});
$('#translate').onclick=()=>perform(async()=>{
 const b=$('#translate');b.disabled=true;$('#native-package-label').hidden=true;
 try{const input=nativeRequest();checkTransport(input);status('');const result=await sdk.action('translate',input);$('#native-result').replaceChildren();
 const title=document.createElement('h3');title.textContent=t(result.manifest?'translated':'blocked');$('#native-result').append(title);
 for(const d of result.diagnostics??[]){const p=document.createElement('p');p.textContent=d.file+':'+d.line+' · '+d.message;$('#native-result').append(p);}
 const fingerprint=document.createElement('code');fingerprint.textContent=result.profile+' · SHA-256 '+result.sourceDigest;$('#native-result').append(fingerprint);
 if(result.decision){const p=document.createElement('p');p.textContent=result.decision.label+' · '+(result.decision.basisPoints/100)+'%';$('#native-result').prepend(p);}
 if(result.manifest){$('#native-package').value=JSON.stringify(result.manifest,null,2);$('#native-package-label').hidden=false;}
 sdk.resize(document.body.scrollHeight+40);
 }finally{b.disabled=false;}
});

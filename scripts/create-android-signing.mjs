import fs from 'node:fs';import crypto from 'node:crypto';import{spawnSync}from'node:child_process';
if(fs.existsSync('android/keystore.properties')){console.log('Existing local signing configuration preserved');process.exit(0)}
fs.mkdirSync('android/.signing',{recursive:true});const password=crypto.randomBytes(32).toString('hex');
const result=spawnSync('keytool',['-genkeypair','-noprompt','-keystore','android/.signing/paper-practice-release.jks','-storetype','PKCS12','-alias','paper-practice','-keyalg','RSA','-keysize','3072','-validity','10000','-dname','CN=Paper Practice, O=Paper Practice','-storepass:env','PAPERLY_SIGNING_PASSWORD','-keypass:env','PAPERLY_SIGNING_PASSWORD'],{env:{...process.env,PAPERLY_SIGNING_PASSWORD:password},encoding:'utf8'});
if(result.status!==0){console.error('Signing key generation failed');process.exit(1)}
fs.chmodSync('android/.signing/paper-practice-release.jks',0o600);fs.writeFileSync('android/keystore.properties',`storeFile=.signing/paper-practice-release.jks\nstorePassword=${password}\nkeyAlias=paper-practice\nkeyPassword=${password}\n`,{mode:0o600});console.log('Local Android signing key created in ignored files; no secret values printed');

import cron from 'node-cron';
import nodemailer from 'nodemailer';
import db from '../db/connection.js';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let currentBackupJob = null;

export const startBackupScheduler = () => {
    // Read the latest configuration from the database explicitly, falling back to 'None' if unset
    const config = getBackupConfig();

    if (currentBackupJob) {
        currentBackupJob.stop();
        currentBackupJob = null;
    }

    if (config.schedule === 'Hourly') {
        console.log('🕒 Initializing Hourly Database Backup Schedule');
        currentBackupJob = cron.schedule('0 * * * *', () => executeBackupJob(config));
    } else if (config.schedule === 'Daily') {
        console.log('🕒 Initializing Daily Database Backup Schedule');
        currentBackupJob = cron.schedule('0 0 * * *', () => executeBackupJob(config));
    } else {
        console.log('🕒 Database Backup Schedule is DISABLED');
    }
};

const getBackupConfig = () => {
    try {
        const rows = db.prepare('SELECT key, value FROM settings WHERE key IN ("backup_schedule", "backup_location", "backup_email_enabled", "backup_email_from", "backup_email_pass", "backup_email_to")').all();
        const map = {};
        rows.forEach(r => map[r.key] = r.value);
        return {
            schedule: map['backup_schedule'] || 'None',
            location: map['backup_location'] || './data/backups',
            emailEnabled: map['backup_email_enabled'] === 'true',
            emailFrom: map['backup_email_from'],
            emailPass: map['backup_email_pass'],
            emailTo: map['backup_email_to']
        };
    } catch {
        return { schedule: 'None' }; // Failsafe if DB isn't initialized yet
    }
};

const executeBackupJob = async (config) => {
    const backupDir = path.resolve(__dirname, '../../', config.location);
    if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `backup-auto-${timestamp}.db`;
    const filepath = path.join(backupDir, filename);

    try {
        console.log(`💾 Starting automated backup: ${filename}`);
        await db.backup(filepath);
        console.log(`✅ Backup completed successfully.`);

        // Mail it if configured
        if (config.emailEnabled && config.emailFrom && config.emailPass && config.emailTo) {
            await sendBackupEmail(config, filepath, filename);
        }

    } catch (err) {
        console.error(`❌ Automated backup failed:`, err);
    }
};

const sendBackupEmail = async (config, filepath, filename) => {
    try {
        const stat = fs.statSync(filepath);
        const sizeMB = stat.size / (1024 * 1024);

        // Typical Gmail attachment limit is 25MB
        if (sizeMB > 25) {
            console.log(`⚠️ Backup file (${sizeMB.toFixed(2)}MB) is too large for email attachment. Check server directly.`);
            return;
        }

        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: config.emailFrom,
                pass: config.emailPass
            }
        });

        const mailOptions = {
            from: config.emailFrom,
            to: config.emailTo,
            subject: `Database Automated Backup: ${filename}`,
            text: `Please find the attached database backup executed via automated scheduler.`,
            attachments: [
                {
                    filename: filename,
                    path: filepath
                }
            ]
        };

        const result = await transporter.sendMail(mailOptions);
        console.log(`📧 Backup successfully emailed to ${config.emailTo}. Message ID: ${result.messageId}`);
    } catch (err) {
        console.error(`❌ Failed to email backup:`, err);
    }
};

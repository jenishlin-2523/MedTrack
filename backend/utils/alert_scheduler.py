from apscheduler.schedulers.background import BackgroundScheduler
from flask_mail import Mail, Message
from datetime import datetime, timedelta

def send_email(recipient, subject, body):
    import smtplib, ssl
    from email.mime.text import MIMEText

    msg = MIMEText(body)
    msg["Subject"] = subject
    msg["From"] = "Pharmacy Alert"
    msg["To"] = recipient

    smtp = smtplib.SMTP_SSL("smtp.gmail.com", 465)
    smtp.login("yourmail@gmail.com", "yourpassword")
    smtp.send_message(msg)
    smtp.quit()

def check_alerts(app, mongo):
    with app.app_context():
        today = datetime.now()
        near_expiry = today + timedelta(days=30)
        near_depletion = today + timedelta(days=5)

        users = mongo.db.users.find()
        for user in users:
            user_id = user["_id"]
            meds = mongo.db.medicines.find({"addedBy": user_id})
            expiring = []
            refill = []

            for med in meds:
                if med["expiryDate"] <= near_expiry:
                    expiring.append(med["name"])
                if med["depletionDate"] <= near_depletion:
                    refill.append(med["name"])

            if expiring or refill:
                body = ""
                if expiring:
                    body += "⚠️ Medicines expiring soon:\n" + "\n".join(expiring) + "\n\n"
                if refill:
                    body += "🔁 Medicines needing refill:\n" + "\n".join(refill)
                send_email(user["email"], "Medicine Alert", body)

def start_scheduler(app, mongo):
    scheduler = BackgroundScheduler()
    scheduler.add_job(lambda: check_alerts(app, mongo), trigger="interval", hours=24)
    scheduler.start()

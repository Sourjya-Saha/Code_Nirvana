import hashlib
import random
import smtplib
from email.message import EmailMessage
from datetime import datetime

def sign_up(connection, username, password, user_type, metamask_add, user_lat, user_long):
    cursor = connection.cursor()

    # Hash the password before storing it
    hashed_password = hashlib.sha256(password.encode()).hexdigest()

    try:
        # Check if the username already exists
        check_user_query = "SELECT COUNT(*) FROM users WHERE user_id = %s"
        cursor.execute(check_user_query, (username,))
        (user_count,) = cursor.fetchone()

        if user_count > 0:
            return "Error: Username already exists. Please choose a different username."

        # Check if the metamask_id already exists
        check_user_query = "SELECT COUNT(*) FROM users WHERE metamask_add = %s"
        cursor.execute(check_user_query, (metamask_add,))
        (user_count,) = cursor.fetchone()

        if user_count > 0:
            return "Error: Metamask ID already exists. Please choose a different Metamask."

        # SQL query to insert a new user
        sign_up_query = "INSERT INTO users (user_id, password, user_type, metamask_add, user_lat, user_long) VALUES (%s, %s, %s, %s, %s, %s)"
        sign_up_data = (username, hashed_password, user_type, metamask_add, user_lat, user_long)

        cursor.execute(sign_up_query, sign_up_data)
        connection.commit()
        return "User signed up successfully."

    except Exception as e:
        connection.rollback()
        # You might want to log the error here
        print(f"Error: {str(e)}")
        return f"An error occurred: {str(e)}"

    finally:
        cursor.close()


def otpverification(to_mail):
    otp = ""
    for i in range(6):
        otp += str(random.randint(0,9))
    print(otp)
    server = smtplib.SMTP('smtp.gmail.com', 587)
    server.starttls()

    from_mail = 'nirvanahealthchain@gmail.com'
    server.login(from_mail, "cfev fhqu jfih mvkx")
    msg = EmailMessage()
    msg['Subject'] = "OTP Verification"
    msg['From'] = from_mail
    msg['To'] = to_mail
    msg.set_content("Your OTP is: " + otp)
    server.send_message(msg)

    print("email sent")
    start=datetime.now()

    return otp, start

def verify(otp, start, user_otp):
    end= datetime.now()
    if (end-start).total_seconds()<300:
        if user_otp==otp:
            return "verification successfull"
        else:
            return "wrong otp"
    else:
        return "exceeded time"


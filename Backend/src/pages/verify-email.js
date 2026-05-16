export const html = `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Email Verified</title>

<style>
    * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    }

    body {
        height: 100vh;
        display: flex;
        justify-content: center;
        align-items: center;
        background: linear-gradient(135deg, #667eea, #764ba2);
    }

    .card {
        background: #ffffff;
        padding: 40px 30px;
        border-radius: 12px;
        text-align: center;
        max-width: 400px;
        width: 90%;
        box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
        animation: fadeIn 0.6s ease-in-out;
    }

    .icon {
        font-size: 50px;
        margin-bottom: 15px;
    }

    .icon span {
        display: inline-block;
        background: #28a745;
        color: white;
        border-radius: 50%;
        width: 70px;
        height: 70px;
        line-height: 70px;
        font-size: 35px;
    }

    h1 {
        font-size: 24px;
        color: #222;
        margin-bottom: 10px;
    }

    p {
        font-size: 15px;
        color: #666;
        margin-bottom: 25px;
        line-height: 1.5;
    }

    a.button {
        display: inline-block;
        padding: 12px 25px;
        background: #667eea;
        color: white;
        text-decoration: none;
        border-radius: 6px;
        font-weight: 500;
        transition: 0.3s ease;
    }

    a.button:hover {
        background: #5a67d8;
        transform: translateY(-2px);
    }

    @keyframes fadeIn {
        from {
            opacity: 0;
            transform: translateY(20px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }

    @media (max-width: 480px) {
        .card {
            padding: 30px 20px;
        }

        h1 {
            font-size: 20px;
        }
    }
</style>
</head>

<body>

<div class="card">
    <div class="icon">
        <span>✔</span>
    </div>

    <h1>Email Verified 🎉</h1>

    <p>
        Your email has been successfully verified.  
        You can now access your account securely.
    </p>

    <a href="http://localhost:3000/api/auth/login" class="button">
        Go to Login →
    </a>
</div>

</body>
</html>
`;

export const alreadyVerifiedHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Email Already Verified</title>

<style>
    * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    }

    body {
        height: 100vh;
        display: flex;
        justify-content: center;
        align-items: center;
        background: linear-gradient(135deg, #667eea, #764ba2);
    }

    .card {
        background: #ffffff;
        padding: 40px 30px;
        border-radius: 12px;
        text-align: center;
        max-width: 400px;
        width: 90%;
        box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
        animation: fadeIn 0.6s ease-in-out;
    }

    .icon {
        font-size: 50px;
        margin-bottom: 15px;
    }

    .icon span {
        display: inline-block;
        background: #667eea;
        color: white;
        border-radius: 50%;
        width: 70px;
        height: 70px;
        line-height: 70px;
        font-size: 35px;
    }

    h1 {
        font-size: 24px;
        color: #222;
        margin-bottom: 10px;
    }

    p {
        font-size: 15px;
        color: #666;
        margin-bottom: 25px;
        line-height: 1.5;
    }

    a.button {
        display: inline-block;
        padding: 12px 25px;
        background: #667eea;
        color: white;
        text-decoration: none;
        border-radius: 6px;
        font-weight: 500;
        transition: 0.3s ease;
    }

    a.button:hover {
        background: #5a67d8;
        transform: translateY(-2px);
    }

    @keyframes fadeIn {
        from {
            opacity: 0;
            transform: translateY(20px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }

    @media (max-width: 480px) {
        .card {
            padding: 30px 20px;
        }

        h1 {
            font-size: 20px;
        }
    }
</style>
</head>

<body>

<div class="card">
    <div class="icon">
        <span>i</span>
    </div>

    <h1>Email Already Verified</h1>

    <p>
        This email address is already verified.
        You can safely close this page or log in to your account.
    </p>

    <a href="http://localhost:3000/api/auth/login" class="button">
        Go to Login →
    </a>
</div>

</body>
</html>
`;
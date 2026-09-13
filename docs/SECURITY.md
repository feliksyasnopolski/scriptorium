# Account security

Scriptorium authenticates with a username and password. It does not collect
email addresses or phone numbers.

Authenticator-app TOTP credentials are optional recovery credentials, not
mandatory two-factor authentication for normal login. A user may configure
multiple confirmed credentials. Possession of any valid configured credential
can reset the password. If a user loses the password and has no configured
recovery credential, the account is unrecoverable by design.

TOTP secrets are encrypted at rest and are shown only during enrollment.
Enrollment and removal require the current password. Recovery uses a narrow
server-side attempt limit, rejects straightforward TOTP timestep replay, and
revokes every existing device session before issuing one fresh session.

Passkeys may be added later as another recovery credential type; they are not
implemented by this document or the current application.

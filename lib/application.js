// Validation and display labels for puppy applications.

export const LABELS = {
  home: {
    farm: 'Working farm or ranch',
    rural: 'Homestead or rural acreage',
    suburban: 'Suburban home with a fenced yard',
    other: 'Other',
  },
  timeline: {
    now: 'Ready now',
    '6mo': 'Within 6 months',
    '1yr': 'Within a year',
    researching: 'Just researching',
    custom: 'Custom',
  },
  sex: { male: 'Male', female: 'Female', either: 'No preference' },
  experience: {
    first: 'First guardian dog',
    owned: 'Has owned guardian breeds',
    working: 'Currently works guardian dogs',
  },
};

export const STATES = new Set(
  'AL AK AZ AR CA CO CT DE DC FL GA HI ID IL IN IA KS KY LA ME MD MA MI MN MS MO MT NE NV NH NJ NM NY NC ND OH OK OR PA RI SC SD TN TX UT VT VA WA WV WI WY'.split(' ')
);

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
// eslint-disable-next-line no-control-regex
const CONTROL = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;

function line(v, max) {
  if (typeof v !== 'string') return '';
  return v.replace(CONTROL, '').replace(/\s+/g, ' ').trim().slice(0, max);
}
function block(v, max) {
  if (typeof v !== 'string') return '';
  return v.replace(CONTROL, '').replace(/\r\n?/g, '\n').replace(/\n{3,}/g, '\n\n').trim().slice(0, max);
}

export function validateApplication(body) {
  const errors = {};
  const v = {
    name: line(body.name, 100),
    email: line(body.email, 200).toLowerCase(),
    phone: line(body.phone, 40),
    city: line(body.city, 100),
    state: line(body.state, 2).toUpperCase(),
    home: line(body.home, 20),
    timeline: line(body.timeline, 20),
    timeline_custom: line(body.timeline_custom, 120),
    sex: line(body.sex, 10),
    experience: line(body.experience, 10),
    message: block(body.message, 3000),
  };

  if (v.name.length < 2) errors.name = 'Please tell us your name.';
  if (!EMAIL.test(v.email)) errors.email = 'Enter a valid email address.';
  if (v.phone.replace(/\D/g, '').length < 7) errors.phone = 'Enter a phone number we can reach you on.';
  if (!v.city) errors.city = 'Please add your city.';
  if (!STATES.has(v.state)) errors.state = 'Please choose your state.';
  if (!(v.home in LABELS.home)) errors.home = 'Please choose the closest match.';
  if (!(v.timeline in LABELS.timeline)) errors.timeline = 'Please choose a timeline.';
  if (v.timeline === 'custom' && !v.timeline_custom) errors.timeline_custom = 'Tell us roughly when you’d like your puppy.';
  if (v.timeline !== 'custom') v.timeline_custom = '';
  if (v.sex && !(v.sex in LABELS.sex)) errors.sex = 'Choose one of the options.';
  if (v.experience && !(v.experience in LABELS.experience)) errors.experience = 'Choose one of the options.';
  if (v.message.length < 10) errors.message = 'A few sentences help us match the right puppy.';

  return { errors, value: v };
}

export function describe(app) {
  return {
    home: LABELS.home[app.home] || app.home,
    timeline: app.timeline === 'custom' ? `Custom: ${app.timeline_custom}` : LABELS.timeline[app.timeline] || app.timeline,
    sex: app.sex ? LABELS.sex[app.sex] : 'No answer',
    experience: app.experience ? LABELS.experience[app.experience] : 'No answer',
  };
}

import React, { Component } from 'react';
import '../../../App.css';
import './qAndA.css';
import '../../questions/myQuestions.css';
import fire from '../../../fire.js';
import Dropdown from '../../dropdown/dropdown';
import Popup from "reactjs-popup";
import bottle from '../../../questionbottle.svg';
import moment from 'moment';
import ReactGA from 'react-ga';


export class QAndAMain extends Component {
    constructor() {
        super();
        this.state = {
            questions: null,
            question: '',
            name: '',
            selectedSpeaker: 0,
            confirmationOpen: false,
            open: false,
            openCheck: false
        }
        this.componentDidMount = this.componentDidMount.bind(this);
    }

    handleChange = (e) => {
        this.setState({ [e.target.name] : e.target.value });
    }

    // code for ask speaker question popup  
    //this fires when the user closes the bottle popup - unfortunately can't run this when they click send
    closeConfirmation = () => {
        this.setState({
            asked: true
        })
    }


    openConfirmation = (e) => {
        e.preventDefault()
        this.setState({confirmationOpen: true})
    }


    // opens the pop-up modal
    openModal = () => {
      const { name, question } = this.state;
      this.setState({ 
        open: true,
        name: name,
        question: question
      })
    }

    // closes the popup modal
    closeModal = () => {
      const { name, question } = this.state;
      this.setState({ 
        open: false,
        name: name,
        question: question
      })
    }

    // opens the "are you sure" pop-up modal
    openCheck = () => {
      const { question, name } = this.state;
      let errors = this.validate(question);
      if (errors.question) {
          return this.setState({
              errors: errors
          })
      }
      this.setState({ 
        openCheck: true,
        open: false,
        name: name,
        question: question
      })
    }

    // closes the "are you sure" popup modal
    closeCheck = () => {
      const { name, question } = this.state;
        this.setState({ 
          open: true,
          openCheck: false,
          name: name,
          question: question,
          errors: undefined
        })
    }    

    // function fired on the submit button for the Ask Question popup
    // calls closeModalandOpenConfirmation, which then actually sends the question
    sendQuestion = (e) => {
        e.preventDefault()
        if (this.state.question.length > 0 ) {
            this.setState({
                open: false,
                openCheck: false,
                confirmationOpen: true
            }, () => this.createQuestion())
        }
        else {
            return;
        }
    }

    checkIfAsked = () => {
        const db = fire.firestore()
        if (localStorage.getItem('fingerprint') === null) {
            return this.setState({
                asked: false,
            })
        }
        db.collection(this.props.db)
        .doc('speakers')
        .collection('speakers')
        .doc(this.state.speakers[this.state.selectedSpeaker].email)
        .collection('questions')
        .doc(localStorage.getItem('fingerprint'))
        .get()
        .then((doc) => {
          if (doc.exists) {
            /** Doc exists, so the username is not available */
            return this.setState({
                asked: true
            })
          }
          else {
            return this.setState({
                asked: false
            })
          }
        })
    }

    validate = (question) => {
        // true means invalid, so our conditions got reversed
        return {
          question: question.length === 0,
        };
      }

    createQuestion = () => {
        const question = this.state.question;
        let errors = this.validate(question);
        if (errors.question) {
            return this.setState({
                errors: errors
            })
        }
        var name = this.state.name;
        if (name === "")  {
            name = "anonymous"
        }
        let now = moment().format('MMMM Do YYYY, h:mm:ss a');
        let db = fire.firestore();
        let that = this;
        if (localStorage.getItem('fingerprint') === null) {
            db.collection(this.props.db)
            .doc('speakers')
            .collection('speakers')
            .doc(this.state.speakers[this.state.selectedSpeaker].email)
            .collection("questions").add({
                question: this.state.question,
                name: name,
                answer: "",
                timeAsked: now
            })
            .then(function() {
                that.setState({
                    name: '',
                    question: '',
                    open: false,
                    openCheck: false
                    
                }, () =>                 
                ReactGA.event({
                    category: 'User',
                    action: 'Create Question without Fingerprint on Q&A Page'
                }, () => this.componentDidMount()))
            })
            .catch(function(error) {
                console.error("Error writing document: ", error);
            });
        }
        else {
            db.collection(this.props.db)
            .doc('speakers')
            .collection('speakers')
            .doc(this.state.speakers[this.state.selectedSpeaker].email)
            .collection("questions")
            .doc(localStorage.getItem('fingerprint')).set({
                question: this.state.question,
                name: name,
                answer: "",
                timeAsked: now
            })
            .then(function() {
                that.setState({
                    name: '',
                    question: '',
                    open: false,
                    openCheck: false
                }, () =>                 
                ReactGA.event({
                    category: 'User',
                    action: 'Create Question with Fingerprint on Q&A Page'
                }, () => this.componentDidMount()))
            })
            .catch(function(error) {
                console.error("Error writing document: ", error);
            });
        }
    }

    // get speaker info based on which speaker is currently selected
    checkSpeaker = () => {
        const db = fire.firestore();
        db.collection(this.props.db)
        .doc('speakers')
        .collection('speakers')
        .doc(this.state.speakers[this.state.selectedSpeaker].email)
        .get()
        .then((doc) => {
          if (doc.exists) {
            return this.setState({
                speakerRef: doc.data()
            }, () => this.checkIfAsked())
          }
          else {
            return this.setState({
                speakerRef: null
            })
          }
        })
    }

    toggleButtons = (e, index) => {
        e.preventDefault();
        this.setState({
            selectedSpeaker: index
        }, this.componentDidMount())
    }

    render () {
        const popupStyle = {
            display: 'flex',
            justifyText: 'center',
            flexDirection: 'column',
            alignItems: 'space-between',
            padding: '20px 20px',
            width: '80%',
            border: 'none',
            borderRadius: '10px'
        }

        let speakerButtons = []

        for (let speaker in this.state.speakers) {
            speakerButtons.push(
                <button key={speaker} onClick={e => this.toggleButtons(e, speaker)} style={{boxShadow: 'none'}} className={speaker.toString() === this.state.selectedSpeaker.toString() ? "button-primary medium" : "button-primary medium blank"}>{this.state.speakers[speaker].first}</button>
            )
        }
        let newList = [];
        if (this.state.questions !== null) {
        this.state.questions.forEach(question => {  
            if (question.answer.length > 0 ) {
            newList.push (
                <div className="speaker" key={Math.random()}>
                <Dropdown question={question.question}>
                    <form className="questions-form">
                        <label style={{marginTop: '0'}}>Question:</label>
                        <p>"{question.question}"</p>
                        <label style={{marginTop: '0'}}>FROM: {question.name}</label>
                        <p>Answer: </p>
                        <p>"{question.answer}"</p>
                    </form>
                </Dropdown>
                </div>
            )
            }  
    
        })
    }
    return (
        <div className="faq">
            <div className="justified">
                {speakerButtons}
            </div>
            <div className="content">
            {this.state.asked !== undefined ? 
                <div>
                { this.state.asked === true ?
                    // prevent user from asking multiple questions, if we have their device fingerprint on file
                    <div className="questi0n-btn-container">
                        <h6><button className="questi0n-btn question-pos-asked">Asked</button></h6>
                    </div>
                :
                    <div className="questi0n-btn-container">
                        <h6><button onClick={() => this.openModal()} className="questi0n-btn question-pos">Ask Question</button></h6>
                        <Popup
                        open={this.state.open}
                        closeOnDocumentClick
                        onClose={this.closeModal}
                        contentStyle={popupStyle}
                        >
                        <div className="modal">
                            <div>
                                {this.state.speakerRef !== undefined && this.state.speakerRef !== null ? 
                                    <h4>Dear {this.state.speakerRef.first + " " + this.state.speakerRef.last},</h4>
                                :
                                    <div></div>
                                }
                                <textarea type="text" id="iOS" required autoComplete="off" className={this.state.errors === undefined || this.state.errors.question === false ? "popup-input" : "popup-input-invalid" } name="question" value={this.state.question} placeholder="Write your question here..." onChange={this.handleChange}/>
                                {this.state.errors === undefined ?
                                    <small> </small>
                                :
                                    <small className="small-red">Please ask a question before submitting.</small>
                                }
                                <h4>Sincerely, </h4>
                                <input type="text" style={{height: '20px'}} autoComplete="off" className="popup-input-small" required minLength="4" size="10" placeholder="Your name..." name="name" value={this.state.name} onChange={this.handleChange}/>
                                <div className="popup-btns">
                                    <button className="popup-btn-cancel" onClick={this.closeModal}>Cancel</button>
                                    <button className="popup-btn-success button-primary" onClick={this.openCheck}>Submit</button>
                                </div>
                            </div>
                        </div>
                        </Popup>
                        <Popup
                        open={this.state.openCheck}
                        closeOnDocumentClick
                        onClose={this.closeCheck}
                        contentStyle={popupStyle}
                        >
                        <div className="modal">
                            <div>
                                <h4>Ready to send off? </h4>
                                <h6 style={{color: 'black'}}>To prevent spam, you are limited to one question per speaker.</h6>
                                <div className="popup-btns">
                                    <button className="popup-btn-cancel" onClick={this.closeCheck}>Go Back</button>
                                    <button className="popup-btn-success button-primary" onClick={e => this.sendQuestion(e)}>Confirm</button>
                                </div>
                            </div>
                        </div>
                        </Popup>
                        <Popup
                        open={this.state.confirmationOpen}
                        closeOnDocumentClick
                        onClose={this.closeConfirmation}
                        contentStyle={popupStyle}
                        >
                        <div className="modal">
                            <div className="popup-response">
                                <img src={bottle} className="bottle" alt="Bottle" />
                                <p className="confirmation-text">Thank you for asking a question! Please check back on the Q &amp; A page later.</p>
                                <button className="popup-button-success button-primary" style={{width: '100%', borderRadius: '24px'}} onClick={this.closeConfirmation}>Ok</button>
                            </div>
                        </div>
                        </Popup>
                    </div>
                }
                </div>
            :
                <div></div>
            }
                {this.state.questions !== null && this.state.questions.length > 0 ?
                    <div className="speakers">
                        {newList}
                    </div>
                    :
                    <h4 className="speakers" style={{paddingTop: '20px', textAlign: 'center'}}>{this.state.speakerRef !== undefined && this.state.speakerRef !== null ? this.state.speakerRef.first + " " + this.state.speakerRef.last + " has not answered any questions yet. Check back later!" : "No answered questions yet. Check back later!"}</h4>
                }
            </div>

      </div>
    )
  }

  componentWillUnmount = () => {
    window.addEventListener('scroll', this.props.handleScroll);
  }

  componentDidMount = () => {
    window.removeEventListener('scroll', this.props.handleScroll);
    const db = fire.firestore();
    let speakers = [];
    db.collection(this.props.db).doc('speakers').collection('speakers').get().then(snapshot => {
        snapshot.forEach(docSnapshot => {
            speakers.push(docSnapshot.data())
        })
        if (speakers.length === snapshot.size) {
            this.setState({
                speakers: speakers
            }, () => this.getSelectedSpeakerQuestions())
        }
    })
  }

  getSelectedSpeakerQuestions = () => {
    let db = fire.firestore();
    let wholeData = [];
    db.collection(this.props.db).doc('speakers').collection('speakers').doc(this.state.speakers[this.state.selectedSpeaker].email).collection("questions").get()
    .then(snapshot => {
        snapshot.forEach(doc => {
            if (doc.data().answer !== "" ) {
                let docCopy = doc.data();
                docCopy.id = doc.id;
                docCopy.answered = false;
                wholeData.push(docCopy)
            }
        });
      this.setState(
        {questions: wholeData,
        confirmationOpen: false
        }
        , () => this.checkSpeaker())
    })
  }

}
  
export default QAndAMain;
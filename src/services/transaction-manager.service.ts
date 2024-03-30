import { TransactionModel } from '../domain/transaction.model';
import { MoneyModel } from '../domain/money.model';
import { AccountsRepository } from '../repository/accounts.repository';
import dayjs from 'dayjs';
import { AccountType } from '../domain/account-type.enum';
import { CurrencyType } from '../domain/currency-type.enum';
import { getConversionRate } from '../utils/money.utils';

export class TransactionManagerService {
  // adding some preconditions for handling edge cases

  public transfer(fromAccountId: string, toAccountId: string, value: MoneyModel): TransactionModel {
    const fromAccount = AccountsRepository.get(fromAccountId);
    const toAccount = AccountsRepository.get(toAccountId);

    if (!fromAccount || !toAccount) {
      throw new Error('Specified account does not exist');
    }

    // checking account type

    if (((fromAccount.accountType===AccountType.SAVINGS) && (toAccount.accountType===AccountType.SAVINGS)) || (fromAccount.accountType===AccountType.SAVINGS) && (toAccount.accountType===AccountType.CHECKING)){
      throw new Error("You cannot perform the transfer functionality between the following types of accounts")

    }

    const transaction = new TransactionModel({
      id: crypto.randomUUID(),
      from: fromAccountId,
      to: toAccountId,
      amount: value,
      timestamp: dayjs().toDate(),
    });
    // fund checking

    if(fromAccount.balance.amount<value.amount){
      throw new Error("Insufficient funds")
    }
    if(fromAccount?.balance.currency!==toAccount.balance.currency){
      try {
        // @ts-ignore
        let conversionRate=getConversionRate(fromAccount?.balance.currency,toAccount.balance.currency)
        toAccount.balance.amount=toAccount.balance.amount * conversionRate;
        // @ts-ignore
        toAccount.balance.currency=fromAccount?.balance.currency
      }catch (error){
        // @ts-ignore
        throw new Error("Error at currency converting :" + error.message)
      }
    }
    fromAccount.balance.amount -= value.amount;
    fromAccount.transactions = [...fromAccount.transactions, transaction];
    toAccount.balance.amount += value.amount;
    toAccount.transactions = [...toAccount.transactions, transaction];

    return transaction;
  }

// the 'withdraw' function is similar to the transaction function but there won't be 2 different accounts
  public withdraw(accountId: string, amount: MoneyModel): TransactionModel {
    if(!AccountsRepository.exist(accountId)){
      throw new Error('Account does not exist');
    }
    const account= AccountsRepository.get(accountId);
    // @ts-ignore
    //Checking to see if the balance is sufficient for the withdrawal
    if(this.checkFunds(accountId)<amount.amount){
      throw new Error("Not enough money :'( ");
    }
    // @ts-ignore
    //currency checking ;-;
    if(account?.balance.currency!==amount.currency){
      try {
        // @ts-ignore
        let conversionRate=getConversionRate(account?.balance.currency,amount.currency)
        amount.amount=amount.amount * conversionRate;
        // @ts-ignore
        amount.currency=account?.balance.currency
      }catch (error){
        // @ts-ignore
        throw new Error("Error at currency converting :" + error.message)
      }
    }

    //creating the withdrawal transaction
    const transaction = new TransactionModel({
      id:crypto.randomUUID(),
      from:accountId,
      to:accountId,
      amount:amount,
      timestamp:dayjs().toDate()
    });
    // @ts-ignore
    account?.balance.amount-=amount.amount;
    account?.transactions.push(transaction)
    return transaction
  }

  public checkFunds(accountId: string): MoneyModel {
    if (!AccountsRepository.exist(accountId)) {
      throw new Error('Specified account does not exist');
    }
    return AccountsRepository.get(accountId)!.balance;
  }

  public retrieveTransactions(accountId: string): TransactionModel[] {
    if (!AccountsRepository.exist(accountId)) {
      throw new Error('Specified account does not exist');
    }
    return AccountsRepository.get(accountId)!.transactions;
  }
}

export const TransactionManagerServiceInstance = new TransactionManagerService();
